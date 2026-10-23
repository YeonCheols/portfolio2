import { generateKeyPairSync, sign } from "crypto";
import http from "http";

import { startMcpOAuthGateway } from "@mcp/gateway/server";

const issuer = "https://auth.example.test";
const resourceUrl = "https://mcp.example.test/mcp";
const requiredScope = "resume:use";
const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
});
const publicJwk = {
  ...publicKey.export({ format: "jwk" }),
  kid: "test-key",
  use: "sig",
};

const createToken = (
  claims: Record<string, unknown>,
  key = privateKey,
  kid = "test-key",
): string => {
  const header = Buffer.from(
    JSON.stringify({ alg: "RS256", kid, typ: "JWT" }),
  ).toString("base64url");
  const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
  const input = `${header}.${payload}`;
  const inputBytes = Buffer.from(input);
  const data = new Uint8Array(inputBytes.length);
  for (let index = 0; index < inputBytes.length; index += 1) {
    data[index] = inputBytes[index];
  }
  return `${input}.${sign("RSA-SHA256", data, key).toString("base64url")}`;
};

const readRequestBody = (body: BodyInit | null | undefined): string => {
  if (typeof body === "string") return body;
  if (!Buffer.isBuffer(body)) return "";
  let text = "";
  for (let index = 0; index < body.length; index += 1) {
    text += String.fromCharCode(body[index]);
  }
  return text;
};

const request = (
  port: number,
  options: {
    path: string;
    token?: string;
    method?: "GET" | "POST";
    headers?: Record<string, string>;
  },
): Promise<{
  status: number;
  headers: http.IncomingHttpHeaders;
  body: string;
}> =>
  new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port,
        method: options.method ?? "POST",
        path: options.path,
        headers: {
          ...(options.token
            ? { authorization: `Bearer ${options.token}` }
            : {}),
          ...options.headers,
        },
      },
      (res) => {
        const chunks: string[] = [];
        res.setEncoding("utf8");
        res.on("data", (chunk: string) => chunks.push(chunk));
        res.on("end", () =>
          resolve({
            status: res.statusCode ?? 0,
            headers: res.headers,
            body: chunks.join(""),
          }),
        );
      },
    );
    req.on("error", reject);
    if ((options.method ?? "POST") === "POST") {
      req.end(JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }));
    } else {
      req.end();
    }
  });

describe("MCP OAuth gateway", () => {
  const originalEnv = { ...process.env };
  const originalFetch = global.fetch;
  const mockFetch = jest.fn();
  let server: http.Server | undefined;

  beforeEach(async () => {
    process.env.MCP_AUTH_ISSUER = issuer;
    process.env.MCP_PUBLIC_URL = resourceUrl;
    process.env.MCP_BACKEND_URL = "https://backend.example.test/mcp";
    process.env.MCP_AUTH_TOKEN = "internal-test-token";
    process.env.MCP_REQUIRED_SCOPE = requiredScope;
    process.env.PORT = "0";
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ keys: [publicJwk] }),
    });
    global.fetch = mockFetch as typeof fetch;
    const startedServer = startMcpOAuthGateway();
    server = startedServer;
    await new Promise<void>((resolve) =>
      startedServer.once("listening", resolve),
    );
  });

  afterEach(async () => {
    if (server) {
      await new Promise<void>((resolve, reject) =>
        server?.close((error) => (error ? reject(error) : resolve())),
      );
    }
    mockFetch.mockReset();
    global.fetch = originalFetch;
    process.env = { ...originalEnv };
  });

  it("유효한 토큰의 scope가 부족하면 403 insufficient_scope를 반환한다", async () => {
    const token = createToken({
      iss: issuer,
      aud: resourceUrl,
      exp: Math.floor(Date.now() / 1000) + 300,
      iat: Math.floor(Date.now() / 1000),
      scope: "other:read",
    });
    if (!server) throw new Error("server missing");
    const address = server.address();
    if (!address || typeof address === "string")
      throw new Error("port missing");

    const response = await request(address.port, { path: "/mcp", token });

    expect(response.status).toBe(403);
    expect(response.headers["www-authenticate"]).toContain(
      'error="insufficient_scope"',
    );
    expect(response.headers["www-authenticate"]).toContain(
      `scope="${requiredScope}"`,
    );
  });

  it("OAuth protected resource 메타데이터에 canonical 리소스와 인증 서버를 제공한다", async () => {
    if (!server) throw new Error("server missing");
    const address = server.address();
    if (!address || typeof address === "string")
      throw new Error("port missing");

    const response = await request(address.port, {
      method: "GET",
      path: "/.well-known/oauth-protected-resource/mcp",
    });

    expect(response.status).toBe(200);
    expect(JSON.parse(response.body)).toEqual({
      resource: resourceUrl,
      authorization_servers: [issuer],
      scopes_supported: [requiredScope],
      bearer_methods_supported: ["header"],
    });
  });

  it("요청의 Host와 forwarded 헤더로 OAuth 리소스 주소가 바뀌지 않는다", async () => {
    if (!server) throw new Error("server missing");
    const address = server.address();
    if (!address || typeof address === "string")
      throw new Error("port missing");

    const response = await request(address.port, {
      method: "GET",
      path: "/.well-known/oauth-protected-resource/mcp",
      headers: {
        host: "attacker.example.test",
        "x-forwarded-host": "attacker.example.test",
        "x-forwarded-proto": "http",
      },
    });

    expect(JSON.parse(response.body).resource).toBe(resourceUrl);
  });

  it("스트림을 지원하지 않는 GET /mcp는 405를 반환하고 백엔드를 호출하지 않는다", async () => {
    const token = createToken({
      iss: issuer,
      aud: resourceUrl,
      exp: Math.floor(Date.now() / 1000) + 300,
      iat: Math.floor(Date.now() / 1000),
      scope: requiredScope,
    });
    if (!server) throw new Error("server missing");
    const address = server.address();
    if (!address || typeof address === "string")
      throw new Error("port missing");

    const response = await request(address.port, {
      method: "GET",
      path: "/mcp",
      token,
    });

    expect(response.status).toBe(405);
    expect(
      mockFetch.mock.calls.some(([input]) =>
        String(input).includes("backend.example.test"),
      ),
    ).toBe(false);
  });

  it("이벤트 스트림 요청은 백엔드 없이 SSE 연결을 연다", async () => {
    const token = createToken({
      iss: issuer,
      aud: resourceUrl,
      exp: Math.floor(Date.now() / 1000) + 300,
      iat: Math.floor(Date.now() / 1000),
      scope: requiredScope,
    });
    if (!server) throw new Error("server missing");
    const address = server.address();
    if (!address || typeof address === "string")
      throw new Error("port missing");

    const response = await new Promise<{
      status: number;
      contentType: string;
      body: string;
    }>((resolve, reject) => {
      const req = http.request(
        {
          hostname: "127.0.0.1",
          port: address.port,
          method: "GET",
          path: "/mcp",
          headers: {
            accept: "text/event-stream",
            authorization: `Bearer ${token}`,
          },
        },
        (res) => {
          res.setEncoding("utf8");
          let body = "";
          let settled = false;
          const finish = () => {
            if (settled) return;
            settled = true;
            resolve({
              status: res.statusCode ?? 0,
              contentType: String(res.headers["content-type"] ?? ""),
              body,
            });
          };
          res.on("data", (chunk: string) => {
            body += chunk;
            finish();
            req.destroy();
          });
          res.on("end", finish);
        },
      );
      req.on("error", (error) => {
        if ((error as NodeJS.ErrnoException).code !== "ECONNRESET")
          reject(error);
      });
      req.end();
    });

    expect(response.status).toBe(200);
    expect(response.contentType).toContain("text/event-stream");
    expect(response.body).toContain(": connected");
    expect(
      mockFetch.mock.calls.some(([input]) =>
        String(input).includes("backend.example.test"),
      ),
    ).toBe(false);
  });

  it("토큰이 없으면 표준 discovery challenge를 반환하고 백엔드를 호출하지 않는다", async () => {
    if (!server) throw new Error("server missing");
    const address = server.address();
    if (!address || typeof address === "string")
      throw new Error("port missing");

    const response = await request(address.port, { path: "/mcp" });

    expect(response.status).toBe(401);
    expect(response.headers["www-authenticate"]).toContain(
      `resource_metadata="https://mcp.example.test/.well-known/oauth-protected-resource/mcp"`,
    );
    expect(response.headers["www-authenticate"]).toContain(
      `scope="${requiredScope}"`,
    );
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("다른 MCP 리소스용 audience 토큰은 거부한다", async () => {
    const token = createToken({
      iss: issuer,
      aud: "https://another.example.test/mcp",
      exp: Math.floor(Date.now() / 1000) + 300,
      iat: Math.floor(Date.now() / 1000),
      scope: requiredScope,
    });
    if (!server) throw new Error("server missing");
    const address = server.address();
    if (!address || typeof address === "string")
      throw new Error("port missing");

    const response = await request(address.port, { path: "/mcp", token });

    expect(response.status).toBe(401);
    expect(response.headers["www-authenticate"]).toContain(
      'error="invalid_token"',
    );
    expect(mockFetch).not.toHaveBeenCalledWith(
      expect.stringContaining("metadata.google.internal"),
      expect.anything(),
    );
  });

  it("캐시에 없는 새 서명 키를 발견하면 JWKS를 갱신해 토큰을 검증한다", async () => {
    const rotatedPair = generateKeyPairSync("rsa", { modulusLength: 2048 });
    const rotatedJwk = {
      ...rotatedPair.publicKey.export({ format: "jwk" }),
      kid: "rotated-key",
      use: "sig",
    };
    let activeKeys = [publicJwk];
    mockFetch.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/.well-known/jwks.json")) {
        return {
          ok: true,
          json: async () => ({ keys: activeKeys }),
        } as Response;
      }
      if (url.startsWith("http://metadata.google.internal/")) {
        return { ok: true, text: async () => "google-id-token" } as Response;
      }
      return {
        ok: true,
        status: 200,
        headers: { get: () => "application/json" },
        body: (async function* () {
          yield Buffer.from(JSON.stringify({ jsonrpc: "2.0", id: 1 }));
        })(),
      } as unknown as Response;
    });
    if (!server) throw new Error("server missing");
    const address = server.address();
    if (!address || typeof address === "string")
      throw new Error("port missing");

    const claims = {
      iss: issuer,
      aud: resourceUrl,
      exp: Math.floor(Date.now() / 1000) + 300,
      iat: Math.floor(Date.now() / 1000),
      scope: requiredScope,
    };
    const initialResponse = await request(address.port, {
      path: "/mcp",
      token: createToken({ ...claims, scope: "other:read" }),
    });
    expect(initialResponse.status).toBe(403);

    activeKeys = [rotatedJwk];
    const rotatedResponse = await request(address.port, {
      path: "/mcp",
      token: createToken(claims, rotatedPair.privateKey, "rotated-key"),
    });

    expect(rotatedResponse.status).toBe(200);
    expect(
      mockFetch.mock.calls.filter(([input]) =>
        String(input).endsWith("/.well-known/jwks.json"),
      ),
    ).toHaveLength(2);
  });

  it("알 수 없는 kid의 JWKS 갱신을 10초 안에 반복하지 않는다", async () => {
    const token = createToken(
      {
        iss: issuer,
        aud: resourceUrl,
        exp: Math.floor(Date.now() / 1000) + 300,
        iat: Math.floor(Date.now() / 1000),
        scope: requiredScope,
      },
      privateKey,
      "unknown-key",
    );
    if (!server) throw new Error("server missing");
    const address = server.address();
    if (!address || typeof address === "string")
      throw new Error("port missing");

    const firstResponse = await request(address.port, {
      path: "/mcp",
      token,
    });
    const secondResponse = await request(address.port, {
      path: "/mcp",
      token,
    });

    expect(firstResponse.status).toBe(401);
    expect(secondResponse.status).toBe(401);
    expect(
      mockFetch.mock.calls.filter(([input]) =>
        String(input).endsWith("/.well-known/jwks.json"),
      ),
    ).toHaveLength(2);
  });

  it("canonical 리소스 audience와 scope가 맞으면 내부 자격 증명으로만 백엔드를 호출한다", async () => {
    const token = createToken({
      iss: issuer,
      aud: resourceUrl,
      exp: Math.floor(Date.now() / 1000) + 300,
      iat: Math.floor(Date.now() / 1000),
      scope: requiredScope,
    });
    const requestBody = JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/list",
    });
    const backendHeaders: HeadersInit[] = [];
    const backendBodies: string[] = [];
    const responseHeaders = {
      "content-type": "application/json",
      "mcp-session-id": "session-response",
      "mcp-protocol-version": "2024-11-05",
    };
    mockFetch.mockImplementation(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.endsWith("/.well-known/jwks.json")) {
          return {
            ok: true,
            json: async () => ({ keys: [publicJwk] }),
          } as Response;
        }
        if (url.startsWith("http://metadata.google.internal/")) {
          return { ok: true, text: async () => "google-id-token" } as Response;
        }

        backendHeaders.push(init?.headers ?? {});
        backendBodies.push(readRequestBody(init?.body));
        return {
          ok: true,
          status: 200,
          headers: {
            get: (name: string) =>
              responseHeaders[name as keyof typeof responseHeaders] ?? null,
          },
          body: (async function* () {
            yield Buffer.from(
              JSON.stringify({ jsonrpc: "2.0", id: 1, result: { tools: [] } }),
            );
          })(),
        } as unknown as Response;
      },
    );
    if (!server) throw new Error("server missing");
    const address = server.address();
    if (!address || typeof address === "string")
      throw new Error("port missing");

    const response = await request(address.port, {
      path: "/mcp",
      token,
      headers: {
        "mcp-session-id": "session-request",
        "mcp-protocol-version": "2024-11-05",
      },
    });

    expect(response.status).toBe(200);
    expect(response.headers["mcp-session-id"]).toBe("session-response");
    expect(response.headers["mcp-protocol-version"]).toBe("2024-11-05");
    expect(backendHeaders).toHaveLength(1);
    expect(backendHeaders[0]).toMatchObject({
      authorization: "Bearer internal-test-token",
      "x-serverless-authorization": "Bearer google-id-token",
      "mcp-session-id": "session-request",
      "mcp-protocol-version": "2024-11-05",
    });
    expect(JSON.stringify(backendHeaders[0])).not.toContain(token);
    expect(backendBodies).toEqual([requestBody]);
  });
});
