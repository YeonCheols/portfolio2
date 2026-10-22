import { createHash, generateKeyPairSync, verify } from "crypto";
import http from "http";

import { startMcpOAuthAuthorizationServer } from "./server";

const issuer = "https://auth.example.test";
const resource = "https://mcp.example.test/mcp";
const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
});
const privateKeyPem = privateKey
  .export({ format: "pem", type: "pkcs8" })
  .toString();

const get = (
  port: number,
  path: string,
): Promise<{ status: number; body: string; location?: string }> =>
  new Promise((resolve, reject) => {
    http
      .get({ hostname: "127.0.0.1", port, path }, (response) => {
        const chunks: string[] = [];
        response.setEncoding("utf8");
        response.on("data", (chunk: string) => chunks.push(chunk));
        response.on("end", () =>
          resolve({
            status: response.statusCode ?? 0,
            body: chunks.join(""),
            location: response.headers.location,
          }),
        );
      })
      .on("error", reject);
  });

const post = (
  port: number,
  path: string,
  body: Record<string, unknown>,
): Promise<{ status: number; body: string }> =>
  new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const request = http.request(
      {
        hostname: "127.0.0.1",
        port,
        path,
        method: "POST",
        headers: {
          "content-type": "application/json",
          "content-length": Buffer.byteLength(payload),
        },
      },
      (response) => {
        const chunks: string[] = [];
        response.setEncoding("utf8");
        response.on("data", (chunk: string) => chunks.push(chunk));
        response.on("end", () =>
          resolve({ status: response.statusCode ?? 0, body: chunks.join("") }),
        );
      },
    );
    request.on("error", reject);
    request.end(payload);
  });

const postForm = (
  port: number,
  path: string,
  body: Record<string, string>,
): Promise<{ status: number; body: string }> =>
  new Promise((resolve, reject) => {
    const payload = new URLSearchParams(body).toString();
    const request = http.request(
      {
        hostname: "127.0.0.1",
        port,
        path,
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          "content-length": Buffer.byteLength(payload),
        },
      },
      (response) => {
        const chunks: string[] = [];
        response.setEncoding("utf8");
        response.on("data", (chunk: string) => chunks.push(chunk));
        response.on("end", () =>
          resolve({ status: response.statusCode ?? 0, body: chunks.join("") }),
        );
      },
    );
    request.on("error", reject);
    request.end(payload);
  });

const mockResponse = (body: unknown, status = 200): Response =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }) as Response;

const issueAuthorizationCode = async (
  port: number,
  githubUserId: number,
  codeChallenge: string,
) => {
  const registration = await post(port, "/register", {
    redirect_uris: ["http://127.0.0.1:43123/callback"],
  });
  const { client_id: clientId } = JSON.parse(registration.body) as {
    client_id: string;
  };
  const query = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: "http://127.0.0.1:43123/callback",
    state: "token-test-state",
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    resource,
    scope: "resume:use",
  });
  const authorization = await get(port, `/authorize?${query}`);
  const githubState = new URL(authorization.location ?? "").searchParams.get(
    "state",
  );
  const originalFetch = Object.getOwnPropertyDescriptor(globalThis, "fetch");
  const fetchMock = jest
    .fn()
    .mockResolvedValueOnce(mockResponse({ access_token: "github-token-test" }))
    .mockResolvedValueOnce(
      mockResponse({ id: githubUserId, login: "test-user" }),
    );
  Object.defineProperty(globalThis, "fetch", {
    configurable: true,
    value: fetchMock,
  });
  try {
    const callback = await get(
      port,
      `/github/callback?${new URLSearchParams({
        code: "github-code-test",
        state: githubState ?? "",
      })}`,
    );
    return {
      callback,
      clientId,
      fetchMock,
      restoreFetch: () => {
        if (originalFetch) {
          Object.defineProperty(globalThis, "fetch", originalFetch);
        } else {
          Reflect.deleteProperty(globalThis, "fetch");
        }
      },
    };
  } catch (error) {
    if (originalFetch)
      Object.defineProperty(globalThis, "fetch", originalFetch);
    else Reflect.deleteProperty(globalThis, "fetch");
    throw error;
  }
};

describe("MCP OAuth authorization server", () => {
  const originalEnv = { ...process.env };
  let server: http.Server | undefined;

  beforeEach(async () => {
    process.env.MCP_AUTH_ISSUER = issuer;
    process.env.MCP_PUBLIC_URL = resource;
    process.env.GITHUB_OAUTH_CLIENT_ID = "test-github-client-id";
    process.env.GITHUB_OAUTH_CLIENT_SECRET = "test-github-client-secret";
    process.env.MCP_AUTHORIZED_GITHUB_USER_IDS = "91575756";
    process.env.MCP_OAUTH_SIGNING_PRIVATE_KEY = privateKeyPem;
    process.env.PORT = "0";
    server = startMcpOAuthAuthorizationServer();
    await new Promise<void>((resolve) => server?.once("listening", resolve));
  });

  afterEach(async () => {
    if (server) {
      await new Promise<void>((resolve, reject) =>
        server?.close((error) => (error ? reject(error) : resolve())),
      );
    }
    process.env = { ...originalEnv };
  });

  it("OAuth 서버 메타데이터에 인증·토큰·JWKS 주소를 제공한다", async () => {
    if (!server) throw new Error("server missing");
    const address = server.address();
    if (!address || typeof address === "string")
      throw new Error("port missing");

    const response = await get(
      address.port,
      "/.well-known/oauth-authorization-server",
    );

    expect(response.status).toBe(200);
    expect(JSON.parse(response.body)).toMatchObject({
      issuer,
      authorization_endpoint: `${issuer}/authorize`,
      token_endpoint: `${issuer}/token`,
      registration_endpoint: `${issuer}/register`,
      jwks_uri: `${issuer}/.well-known/jwks.json`,
      code_challenge_methods_supported: ["S256"],
      authorization_response_iss_parameter_supported: true,
      resource_parameter_supported: true,
    });
  });

  it("게이트웨이가 토큰 검증에 사용할 공개 서명 키를 제공한다", async () => {
    if (!server) throw new Error("server missing");
    const address = server.address();
    if (!address || typeof address === "string")
      throw new Error("port missing");

    const response = await get(address.port, "/.well-known/jwks.json");
    const { keys } = JSON.parse(response.body) as {
      keys: Array<Record<string, unknown>>;
    };

    expect(response.status).toBe(200);
    expect(keys).toHaveLength(1);
    expect(keys[0]).toMatchObject({
      kty: "RSA",
      use: "sig",
      alg: "RS256",
      kid: expect.any(String),
    });
    expect(keys[0]).toHaveProperty("n");
    expect(keys[0]).toHaveProperty("e");
    expect(keys[0]).not.toHaveProperty("d");
  });

  it("MCP resource가 HTTPS /mcp가 아니면 시작하지 않는다", async () => {
    if (server) {
      await new Promise<void>((resolve, reject) =>
        server?.close((error) => (error ? reject(error) : resolve())),
      );
      server = undefined;
    }
    process.env.MCP_PUBLIC_URL = "http://mcp.example.test/mcp";

    let unexpectedServer: http.Server | undefined;
    try {
      expect(() => {
        unexpectedServer = startMcpOAuthAuthorizationServer();
      }).toThrow("MCP_PUBLIC_URL must be an HTTPS /mcp URL");
    } finally {
      if (unexpectedServer) {
        await new Promise<void>((resolve, reject) =>
          unexpectedServer?.close((error) =>
            error ? reject(error) : resolve(),
          ),
        );
      }
    }
  });

  it("유효한 redirect URI를 가진 공개 OAuth 클라이언트를 등록한다", async () => {
    if (!server) throw new Error("server missing");
    const address = server.address();
    if (!address || typeof address === "string")
      throw new Error("port missing");

    const response = await post(address.port, "/register", {
      client_name: "MCP test client",
      redirect_uris: ["http://127.0.0.1:43123/callback"],
      grant_types: ["authorization_code"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
    });

    expect(response.status).toBe(201);
    expect(JSON.parse(response.body)).toMatchObject({
      client_id: expect.any(String),
      client_name: "MCP test client",
      redirect_uris: ["http://127.0.0.1:43123/callback"],
      grant_types: ["authorization_code"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
    });
  });

  it("loopback이 아닌 평문 HTTP redirect URI 등록을 거부한다", async () => {
    if (!server) throw new Error("server missing");
    const address = server.address();
    if (!address || typeof address === "string")
      throw new Error("port missing");

    const response = await post(address.port, "/register", {
      redirect_uris: ["http://client.example.test/callback"],
      token_endpoint_auth_method: "none",
    });

    expect(response.status).toBe(400);
    expect(response.body).toContain('"error":"invalid_client_metadata"');
  });

  it("PKCE와 MCP resource가 유효하면 GitHub 로그인으로 보낸다", async () => {
    if (!server) throw new Error("server missing");
    const address = server.address();
    if (!address || typeof address === "string")
      throw new Error("port missing");
    const registration = await post(address.port, "/register", {
      redirect_uris: ["http://127.0.0.1:43123/callback"],
      token_endpoint_auth_method: "none",
    });
    const { client_id: clientId } = JSON.parse(registration.body) as {
      client_id: string;
    };
    const query = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      redirect_uri: "http://127.0.0.1:43123/callback",
      state: "client-state",
      code_challenge: "A".repeat(43),
      code_challenge_method: "S256",
      resource,
      scope: "resume:use",
    });
    const response = await get(address.port, `/authorize?${query}`);

    expect(response.status).toBe(302);
    const location = new URL(response.location ?? "");
    expect(location.origin).toBe("https://github.com");
    expect(location.pathname).toBe("/login/oauth/authorize");
    expect(location.searchParams.get("redirect_uri")).toBe(
      `${issuer}/github/callback`,
    );
    expect(location.searchParams.get("state")).toEqual(expect.any(String));
  });

  it("OAuth state가 너무 짧으면 GitHub 로그인으로 보내지 않는다", async () => {
    if (!server) throw new Error("server missing");
    const address = server.address();
    if (!address || typeof address === "string")
      throw new Error("port missing");
    const registration = await post(address.port, "/register", {
      redirect_uris: ["http://127.0.0.1:43123/callback"],
      token_endpoint_auth_method: "none",
    });
    const { client_id: clientId } = JSON.parse(registration.body) as {
      client_id: string;
    };
    const query = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      redirect_uri: "http://127.0.0.1:43123/callback",
      state: "short",
      code_challenge: "A".repeat(43),
      code_challenge_method: "S256",
      resource,
      scope: "resume:use",
    });

    const response = await get(address.port, `/authorize?${query}`);

    expect(response.status).toBe(400);
    expect(response.body).toContain('"error":"invalid_request"');
  });

  it("허용된 GitHub 계정이면 MCP authorization code로 돌려보낸다", async () => {
    if (!server) throw new Error("server missing");
    const address = server.address();
    if (!address || typeof address === "string")
      throw new Error("port missing");
    const registration = await post(address.port, "/register", {
      redirect_uris: ["http://127.0.0.1:43123/callback"],
    });
    const { client_id: clientId } = JSON.parse(registration.body) as {
      client_id: string;
    };
    const query = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      redirect_uri: "http://127.0.0.1:43123/callback",
      state: "client-state",
      code_challenge: "A".repeat(43),
      code_challenge_method: "S256",
      resource,
      scope: "resume:use",
    });
    const authorization = await get(address.port, `/authorize?${query}`);
    const githubState = new URL(authorization.location ?? "").searchParams.get(
      "state",
    );
    const originalFetch = Object.getOwnPropertyDescriptor(globalThis, "fetch");
    const fetchSpy = jest
      .fn()
      .mockResolvedValueOnce(
        mockResponse({ access_token: "github-user-token" }),
      )
      .mockResolvedValueOnce(
        mockResponse({ id: 91575756, login: "YeonCheols" }),
      );
    Object.defineProperty(globalThis, "fetch", {
      configurable: true,
      value: fetchSpy,
    });

    try {
      const callback = await get(
        address.port,
        `/github/callback?${new URLSearchParams({ code: "github-code", state: githubState ?? "" })}`,
      );
      const returnUrl = new URL(callback.location ?? "");

      expect(callback.status).toBe(302);
      expect(returnUrl.origin).toBe("http://127.0.0.1:43123");
      expect(returnUrl.searchParams.get("state")).toBe("client-state");
      expect(returnUrl.searchParams.get("iss")).toBe(issuer);
      expect(returnUrl.searchParams.get("code")).toEqual(expect.any(String));
      expect(callback.location).not.toContain("github-user-token");
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    } finally {
      if (originalFetch) {
        Object.defineProperty(globalThis, "fetch", originalFetch);
      } else {
        Reflect.deleteProperty(globalThis, "fetch");
      }
    }
  });

  it("허용목록에 없는 GitHub 계정은 client callback에 access_denied를 받는다", async () => {
    if (!server) throw new Error("server missing");
    const address = server.address();
    if (!address || typeof address === "string")
      throw new Error("port missing");
    const challenge = "A".repeat(43);
    const authorization = await issueAuthorizationCode(
      address.port,
      12345678,
      challenge,
    );

    try {
      expect(authorization.callback.status).toBe(302);
      const returnUrl = new URL(authorization.callback.location ?? "");
      expect(returnUrl.searchParams.get("error")).toBe("access_denied");
      expect(returnUrl.searchParams.get("state")).toBe("token-test-state");
      expect(returnUrl.searchParams.get("iss")).toBe(issuer);
      expect(returnUrl.searchParams.has("code")).toBe(false);
    } finally {
      authorization.restoreFetch();
    }
  });

  it("유효한 authorization code와 PKCE verifier로 MCP 서명 토큰을 발급한다", async () => {
    if (!server) throw new Error("server missing");
    const address = server.address();
    if (!address || typeof address === "string")
      throw new Error("port missing");
    const verifier = "v".repeat(43);
    const challenge = createHash("sha256").update(verifier).digest("base64url");
    const authorization = await issueAuthorizationCode(
      address.port,
      91575756,
      challenge,
    );
    const code = new URL(
      authorization.callback.location ?? "",
    ).searchParams.get("code");

    try {
      const response = await postForm(address.port, "/token", {
        grant_type: "authorization_code",
        code: code ?? "",
        client_id: authorization.clientId,
        redirect_uri: "http://127.0.0.1:43123/callback",
        code_verifier: verifier,
        resource,
      });

      expect(response.status).toBe(200);
      const tokenResponse = JSON.parse(response.body) as {
        access_token: string;
        token_type: string;
        expires_in: number;
        scope: string;
      };
      const [encodedHeader, encodedClaims, encodedSignature] =
        tokenResponse.access_token.split(".");
      const header = JSON.parse(
        Buffer.from(encodedHeader, "base64url").toString("utf8"),
      ) as { alg: string; kid: string };
      const claims = JSON.parse(
        Buffer.from(encodedClaims, "base64url").toString("utf8"),
      ) as Record<string, unknown>;
      expect(header).toMatchObject({ alg: "RS256", kid: expect.any(String) });
      expect(claims).toMatchObject({
        iss: issuer,
        sub: "91575756",
        aud: resource,
        scope: "resume:use",
      });
      expect(
        verify(
          "RSA-SHA256",
          Buffer.from(`${encodedHeader}.${encodedClaims}`),
          publicKey,
          Buffer.from(encodedSignature, "base64url"),
        ),
      ).toBe(true);
      expect(tokenResponse).toMatchObject({
        token_type: "Bearer",
        expires_in: 3600,
        scope: "resume:use",
      });
      const replay = await postForm(address.port, "/token", {
        grant_type: "authorization_code",
        code: code ?? "",
        client_id: authorization.clientId,
        redirect_uri: "http://127.0.0.1:43123/callback",
        code_verifier: verifier,
        resource,
      });
      expect(replay.status).toBe(400);
      expect(replay.body).toContain('"error":"invalid_grant"');
    } finally {
      authorization.restoreFetch();
    }
  });
});

describe("MCP OAuth authorization server entry", () => {
  const originalArgv = process.argv[1];
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.argv[1] = originalArgv;
    process.env = { ...originalEnv };
    jest.restoreAllMocks();
    jest.resetModules();
  });

  it("진입점이 auth/server.js이면 인증서버가 수신을 시작한다", () => {
    process.argv[1] = "/app/dist/auth/server.js";
    process.env.MCP_AUTH_ISSUER = issuer;
    process.env.MCP_PUBLIC_URL = resource;
    process.env.GITHUB_OAUTH_CLIENT_ID = "test-github-client-id";
    process.env.GITHUB_OAUTH_CLIENT_SECRET = "test-github-client-secret";
    process.env.MCP_AUTHORIZED_GITHUB_USER_IDS = "91575756";
    process.env.MCP_OAUTH_SIGNING_PRIVATE_KEY = privateKeyPem;
    process.env.PORT = "0";
    const listen = jest
      .spyOn(http.Server.prototype, "listen")
      .mockImplementation(function mockListen(this: http.Server) {
        return this;
      });

    jest.isolateModules(() => {
      require("./server");
    });

    expect(listen).toHaveBeenCalled();
  });

  it("진입점이 auth/server.js가 아니면 인증서버가 수신을 시작하지 않는다", () => {
    process.argv[1] = "/app/dist/server.js";
    process.env.MCP_AUTH_ISSUER = issuer;
    process.env.MCP_PUBLIC_URL = resource;
    process.env.GITHUB_OAUTH_CLIENT_ID = "test-github-client-id";
    process.env.GITHUB_OAUTH_CLIENT_SECRET = "test-github-client-secret";
    process.env.MCP_AUTHORIZED_GITHUB_USER_IDS = "91575756";
    process.env.MCP_OAUTH_SIGNING_PRIVATE_KEY = privateKeyPem;
    process.env.PORT = "0";
    const listen = jest
      .spyOn(http.Server.prototype, "listen")
      .mockImplementation(function mockListen(this: http.Server) {
        return this;
      });

    jest.isolateModules(() => {
      require("./server");
    });

    expect(listen).not.toHaveBeenCalled();
  });

  it("진입점인데 필수 값이 없으면 수신을 시작하지 않는다", () => {
    process.argv[1] = "/app/dist/auth/server.js";
    delete process.env.MCP_AUTH_ISSUER;
    delete process.env.MCP_PUBLIC_URL;
    delete process.env.GITHUB_OAUTH_CLIENT_ID;
    delete process.env.GITHUB_OAUTH_CLIENT_SECRET;
    delete process.env.MCP_AUTHORIZED_GITHUB_USER_IDS;
    delete process.env.MCP_OAUTH_SIGNING_PRIVATE_KEY;
    const listen = jest
      .spyOn(http.Server.prototype, "listen")
      .mockImplementation(function mockListen(this: http.Server) {
        return this;
      });

    expect(() => {
      jest.isolateModules(() => {
        require("./server");
      });
    }).toThrow("MCP_AUTH_ISSUER is required");
    expect(listen).not.toHaveBeenCalled();
  });
});
