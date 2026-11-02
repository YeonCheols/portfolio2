import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "fs";
import http from "http";
import { tmpdir } from "os";
import { join } from "path";

import { createPortfolioAdminApi } from "@mcp/auth/adminApi";
import { handleAdminRequest } from "@mcp/auth/adminRoutes";

const request = (
  port: number,
  path: string,
  options: {
    method?: string;
    body?: string;
    headers?: Record<string, string>;
  } = {},
) =>
  new Promise<{
    status: number;
    body: string;
    headers: http.IncomingHttpHeaders;
  }>((resolve, reject) => {
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port,
        path,
        method: options.method ?? "GET",
        headers: options.headers,
      },
      (res) => {
        const chunks: string[] = [];
        res.setEncoding("utf8");
        res.on("data", (chunk: string) => chunks.push(chunk));
        res.on("end", () =>
          resolve({
            status: res.statusCode ?? 0,
            body: chunks.join(""),
            headers: res.headers,
          }),
        );
      },
    );
    req.on("error", reject);
    if (options.body) req.write(options.body);
    req.end();
  });

describe("portfolio-api 관리자 라우트", () => {
  const apiUrl = "https://api.example.test";
  const indexHtml =
    '<!doctype html><html><body><div id="root"></div></body></html>';
  let appRoot = "";

  beforeAll(() => {
    appRoot = mkdtempSync(join(tmpdir(), "admin-app-"));
    mkdirSync(join(appRoot, "assets"));
    writeFileSync(join(appRoot, "index.html"), indexHtml);
    writeFileSync(
      join(appRoot, "assets", "index-abc123.js"),
      "console.log(1);",
    );
    writeFileSync(
      join(appRoot, "assets", "index-abc123.css"),
      "body{margin:0}",
    );
    writeFileSync(join(appRoot, "assets", "notes.txt"), "internal");
  });

  afterAll(() => {
    rmSync(appRoot, { recursive: true, force: true });
  });

  const defaultOAuth = {
    startAuthorization: jest.fn().mockResolvedValue({
      authorizationUrl: "https://api.example.test/auth/authorize?state=state",
      clientId: "oauth-client",
      state: "random-state",
      codeVerifier: "v".repeat(43),
      redirectUri: "https://mcp.example.test/admin/ai-models/oauth/callback",
      resource: "https://mcp.example.test/mcp",
    }),
    exchangeCode: jest.fn().mockResolvedValue({
      accessToken: "oauth-access-token",
      expiresIn: 3600,
    }),
  };
  const createServer = (
    fetchImpl: typeof fetch,
    oauth = defaultOAuth,
    root = appRoot,
    introspect: (token: string) => Promise<boolean> = jest
      .fn()
      .mockResolvedValue(true),
  ) =>
    http.createServer((req, res) => {
      handleAdminRequest(req, res, {
        api: createPortfolioAdminApi({
          baseUrl: apiUrl,
          serviceToken: "service-token",
          fetchImpl,
        }),
        introspect,
        oauth,
        publicUrl: "https://mcp.example.test/mcp",
        oauthResource: "https://mcp.example.test/mcp",
        authorizationOrigin: "https://api.example.test",
        appRoot: root,
      })
        .then((handled) => {
          if (!handled) {
            res.writeHead(404);
            res.end();
          }
        })
        // 실제 서버는 이 거부를 잡지 않아 프로세스가 종료되므로 테스트에서는 연결을 끊어 드러낸다
        .catch(() => res.destroy());
    });

  beforeEach(() => {
    defaultOAuth.startAuthorization.mockClear();
    defaultOAuth.exchangeCode.mockClear();
  });

  it("로그인 화면은 빌드된 React 앱의 index.html을 서빙한다", async () => {
    const server = createServer(jest.fn());
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    const port = (server.address() as { port: number }).port;
    try {
      const response = await request(port, "/admin/ai-models/connect");

      expect(response.status).toBe(200);
      expect(response.headers["content-type"]).toContain("text/html");
      expect(response.body).toBe(indexHtml);
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    }
  });

  it("앱 빌드 산출물이 없으면 서버를 죽이지 않고 경로 노출 없이 503으로 응답한다", async () => {
    const emptyRoot = mkdtempSync(join(tmpdir(), "admin-app-empty-"));
    const server = createServer(jest.fn(), defaultOAuth, emptyRoot);
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    const port = (server.address() as { port: number }).port;
    try {
      const first = await request(port, "/admin/ai-models/connect");
      const second = await request(port, "/admin/ai-models/connect");

      expect(first.status).toBe(503);
      expect(first.body).not.toContain(emptyRoot);
      expect(second.status).toBe(503);
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
      rmSync(emptyRoot, { recursive: true, force: true });
    }
  });

  it("인증된 사용자도 앱 산출물이 없으면 세션 쿠키를 지우지 않고 503으로 응답한다", async () => {
    const emptyRoot = mkdtempSync(join(tmpdir(), "admin-app-empty-"));
    const server = createServer(jest.fn(), defaultOAuth, emptyRoot);
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    const port = (server.address() as { port: number }).port;
    try {
      const response = await request(port, "/admin/ai-models", {
        headers: { cookie: "__Host-portfolio-admin-session=admin-jwt" },
      });

      expect(response.status).toBe(503);
      expect(response.headers["set-cookie"]).toBeUndefined();
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
      rmSync(emptyRoot, { recursive: true, force: true });
    }
  });

  it("관리 페이지 응답은 같은 출처 POST에 Origin이 가도록 same-origin 리퍼러 정책을 보낸다", async () => {
    const server = createServer(jest.fn());
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    const port = (server.address() as { port: number }).port;
    try {
      const response = await request(port, "/admin/ai-models/connect");

      expect(response.status).toBe(200);
      expect(response.headers["referrer-policy"]).toBe("same-origin");
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    }
  });

  it("로그인 페이지는 인증 서버와 GitHub로 이어지는 리다이렉트를 form-action CSP에서 허용한다", async () => {
    const server = createServer(jest.fn());
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    const port = (server.address() as { port: number }).port;
    try {
      const response = await request(port, "/admin/ai-models/connect");

      expect(response.headers["content-security-policy"]).toContain(
        "form-action 'self' https://api.example.test https://github.com;",
      );
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    }
  });

  it("모델 관리 로그인은 same-origin POST로 portfolio-api OAuth에 시작한다", async () => {
    const server = createServer(jest.fn());
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    const port = (server.address() as { port: number }).port;
    try {
      const response = await request(port, "/admin/ai-models/oauth/start", {
        method: "POST",
        headers: {
          origin: "https://mcp.example.test",
          "content-length": "0",
        },
      });
      expect(response.status).toBe(303);
      expect(response.headers.location).toBe(
        "https://api.example.test/auth/authorize?state=state",
      );
      expect(response.headers["set-cookie"]?.[0]).toContain(
        "__Host-portfolio-admin-oauth-state=",
      );
      expect(response.headers["set-cookie"]?.[0]).toContain("HttpOnly");
      expect(response.headers["set-cookie"]?.[0]).toContain("Secure");
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    }
  });

  it("OAuth callback state가 일치하면 host-only HttpOnly 세션을 설정한다", async () => {
    const server = createServer(jest.fn());
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    const port = (server.address() as { port: number }).port;
    const stateCookie = Buffer.from(
      JSON.stringify({
        state: "random-state",
        clientId: "oauth-client",
        codeVerifier: "v".repeat(43),
        redirectUri: "https://mcp.example.test/admin/ai-models/oauth/callback",
        resource: "https://mcp.example.test/mcp",
      }),
    ).toString("base64url");
    try {
      const response = await request(
        port,
        "/admin/ai-models/oauth/callback?code=auth-code&state=random-state",
        {
          headers: {
            cookie: `__Host-portfolio-admin-oauth-state=${stateCookie}`,
          },
        },
      );
      expect(response.status).toBe(303);
      expect(response.headers.location).toBe("/admin/ai-models");
      expect(response.headers["set-cookie"]?.[0]).toContain(
        "__Host-portfolio-admin-session=oauth-access-token",
      );
      expect(response.headers["set-cookie"]?.[0]).toContain("HttpOnly");
      expect(response.headers["set-cookie"]?.[0]).not.toContain("Domain=");
      expect(response.headers["set-cookie"]?.[1]).toContain("Max-Age=0");
      expect(defaultOAuth.exchangeCode).toHaveBeenCalledWith({
        code: "auth-code",
        clientId: "oauth-client",
        redirectUri: "https://mcp.example.test/admin/ai-models/oauth/callback",
        codeVerifier: "v".repeat(43),
        resource: "https://mcp.example.test/mcp",
      });
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    }
  });

  it("OAuth callback state가 다르면 code 교환 없이 로그인을 거부한다", async () => {
    const server = createServer(jest.fn());
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    const port = (server.address() as { port: number }).port;
    const stateCookie = Buffer.from(
      JSON.stringify({
        state: "expected-state",
        clientId: "oauth-client",
        codeVerifier: "v".repeat(43),
        redirectUri: "https://mcp.example.test/admin/ai-models/oauth/callback",
        resource: "https://mcp.example.test/mcp",
      }),
    ).toString("base64url");
    try {
      const response = await request(
        port,
        "/admin/ai-models/oauth/callback?code=auth-code&state=attacker-state",
        {
          headers: {
            cookie: `__Host-portfolio-admin-oauth-state=${stateCookie}`,
          },
        },
      );
      expect(response.status).toBe(303);
      expect(response.headers.location).toBe(
        "/admin/ai-models/connect?error=login_failed",
      );
      expect(defaultOAuth.exchangeCode).not.toHaveBeenCalled();
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    }
  });

  it("빌드된 관리 UI 스크립트를 nosniff 헤더와 장기 캐시로 제공한다", async () => {
    const server = createServer(jest.fn());
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    const port = (server.address() as { port: number }).port;
    try {
      const response = await request(
        port,
        "/admin/ai-models/assets/index-abc123.js",
      );
      expect(response.status).toBe(200);
      expect(response.headers["content-type"]).toContain("javascript");
      expect(response.headers["x-content-type-options"]).toBe("nosniff");
      expect(response.headers["cache-control"]).toContain("immutable");
      expect(response.body).toBe("console.log(1);");
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    }
  });

  it("허용하지 않은 확장자와 상위 경로 접근은 에셋으로 제공하지 않는다", async () => {
    const server = createServer(jest.fn());
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    const port = (server.address() as { port: number }).port;
    try {
      for (const path of [
        "/admin/ai-models/assets/notes.txt",
        "/admin/ai-models/assets/..%2Findex.html",
        "/admin/ai-models/assets/%2e%2e%2findex.html",
      ]) {
        const response = await request(port, path);
        expect(response.status).toBe(404);
        expect(response.body).not.toContain("internal");
        expect(response.body).not.toContain('id="root"');
      }
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    }
  });

  it("빌드된 관리 UI 스타일시트를 text/css로 제공한다", async () => {
    const server = createServer(jest.fn());
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    const port = (server.address() as { port: number }).port;
    try {
      const response = await request(
        port,
        "/admin/ai-models/assets/index-abc123.css",
      );
      expect(response.status).toBe(200);
      expect(response.headers["content-type"]).toContain("text/css");
      expect(response.body).toBe("body{margin:0}");
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    }
  });

  it("인증된 대시보드는 세션 토큰을 introspect로 확인하고 동일 출처 설정 API 요청을 허용한다", async () => {
    const introspect = jest.fn().mockResolvedValue(true);
    const server = createServer(jest.fn(), defaultOAuth, appRoot, introspect);
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    const port = (server.address() as { port: number }).port;
    try {
      const response = await request(port, "/admin/ai-models", {
        headers: { cookie: "__Host-portfolio-admin-session=admin-jwt" },
      });
      expect(response.status).toBe(200);
      expect(introspect).toHaveBeenCalledWith("admin-jwt");
      expect(response.body).toBe(indexHtml);
      expect(response.headers["content-security-policy"]).toContain(
        "connect-src 'self'",
      );
      expect(response.headers["content-security-policy"]).toContain(
        "form-action 'self';",
      );
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    }
  });

  it("세션 확인 호출이 실패하면 쿠키를 지우지 않고 503으로 응답한다", async () => {
    const introspect = jest.fn().mockRejectedValue(new Error("TIMEOUT"));
    const server = createServer(jest.fn(), defaultOAuth, appRoot, introspect);
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    const port = (server.address() as { port: number }).port;
    try {
      const response = await request(port, "/admin/ai-models", {
        headers: { cookie: "__Host-portfolio-admin-session=admin-jwt" },
      });

      expect(response.status).toBe(503);
      expect(response.headers["set-cookie"]).toBeUndefined();
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    }
  });

  it("비활성 세션 토큰은 로그인으로 보내고 쿠키를 지운다", async () => {
    const introspect = jest.fn().mockResolvedValue(false);
    const server = createServer(jest.fn(), defaultOAuth, appRoot, introspect);
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    const port = (server.address() as { port: number }).port;
    try {
      const response = await request(port, "/admin/ai-models", {
        headers: { cookie: "__Host-portfolio-admin-session=expired-jwt" },
      });

      expect(response.status).toBe(303);
      expect(response.headers.location).toBe("/admin/ai-models/connect");
      expect(response.headers["set-cookie"]?.[0]).toContain("Max-Age=0");
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    }
  });

  it("모델 설정 프록시는 세션을 확인한 뒤 서비스 토큰으로 portfolio-api를 호출한다", async () => {
    const fetchImpl = jest
      .fn()
      .mockResolvedValue({ ok: true, status: 200, json: async () => [] });
    const introspect = jest.fn().mockResolvedValue(true);
    const server = createServer(fetchImpl, defaultOAuth, appRoot, introspect);
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    const port = (server.address() as { port: number }).port;
    try {
      const response = await request(port, "/admin/ai-models/api/settings", {
        headers: { cookie: "__Host-portfolio-admin-session=api-jwt" },
      });

      expect(response.status).toBe(200);
      expect(introspect).toHaveBeenCalledWith("api-jwt");
      expect(fetchImpl).toHaveBeenCalledWith(
        `${apiUrl}/service/resume-model-setting`,
        expect.objectContaining({
          headers: expect.objectContaining({
            authorization: "Bearer service-token",
          }),
        }),
      );
      expect(JSON.stringify(fetchImpl.mock.calls)).not.toContain("api-jwt");
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    }
  });

  it("세션 확인 호출이 실패하면 세션 만료가 아니라 503으로 응답하고 portfolio-api를 호출하지 않는다", async () => {
    const fetchImpl = jest.fn();
    const introspect = jest.fn().mockRejectedValue(new Error("TIMEOUT"));
    const server = createServer(fetchImpl, defaultOAuth, appRoot, introspect);
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    const port = (server.address() as { port: number }).port;
    try {
      const response = await request(port, "/admin/ai-models/api/settings", {
        headers: { cookie: "__Host-portfolio-admin-session=api-jwt" },
      });

      expect(response.status).toBe(503);
      expect(JSON.parse(response.body).code).toBe("AUTH_UNAVAILABLE");
      expect(fetchImpl).not.toHaveBeenCalled();
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    }
  });

  it("portfolio-api 호출이 실패하면 세션 만료가 아니라 502로 응답하고 내부 정보를 숨긴다", async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ message: "internal: service-token rejected" }),
    });
    const server = createServer(fetchImpl);
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    const port = (server.address() as { port: number }).port;
    try {
      const response = await request(port, "/admin/ai-models/api/settings", {
        headers: { cookie: "__Host-portfolio-admin-session=api-jwt" },
      });

      expect(response.status).toBe(502);
      expect(JSON.parse(response.body).code).toBe("UPSTREAM_FAILED");
      expect(response.body).not.toContain("service-token");
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    }
  });

  it("비활성 세션의 프록시 요청은 401로 거절하고 portfolio-api를 호출하지 않는다", async () => {
    const fetchImpl = jest.fn();
    const introspect = jest.fn().mockResolvedValue(false);
    const server = createServer(fetchImpl, defaultOAuth, appRoot, introspect);
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    const port = (server.address() as { port: number }).port;
    try {
      const response = await request(port, "/admin/ai-models/api/settings", {
        headers: { cookie: "__Host-portfolio-admin-session=revoked-jwt" },
      });

      expect(response.status).toBe(401);
      expect(fetchImpl).not.toHaveBeenCalled();
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    }
  });

  it("수정·활성화·삭제 요청은 같은 출처일 때 service 경로로 서비스 토큰과 함께 전달하고 허용하지 않은 메서드는 405로 거절한다", async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id: 3 }),
    });
    const server = createServer(fetchImpl);
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    const port = (server.address() as { port: number }).port;
    const headers = {
      cookie: "__Host-portfolio-admin-session=api-jwt",
      origin: "https://mcp.example.test",
    };
    const payload = JSON.stringify({ modelName: "openai/gpt-test" });
    try {
      const put = await request(port, "/admin/ai-models/api/settings/3", {
        method: "PUT",
        body: payload,
        headers: { ...headers, "content-type": "application/json" },
      });
      const activate = await request(
        port,
        "/admin/ai-models/api/settings/3/activate",
        { method: "POST", headers },
      );
      const remove = await request(port, "/admin/ai-models/api/settings/3", {
        method: "DELETE",
        headers,
      });
      const wrong = await request(port, "/admin/ai-models/api/settings/3", {
        method: "POST",
        headers,
      });

      expect([put.status, activate.status, remove.status]).toEqual([
        200, 200, 200,
      ]);
      expect(wrong.status).toBe(405);
      expect(
        fetchImpl.mock.calls.map(([url, init]) => [url, init.method]),
      ).toEqual([
        [`${apiUrl}/service/resume-model-setting/3`, "PUT"],
        [`${apiUrl}/service/resume-model-setting/3/activate`, "POST"],
        [`${apiUrl}/service/resume-model-setting/3`, "DELETE"],
      ]);
      expect(fetchImpl.mock.calls[0][1].body).toBe(payload);
      expect(JSON.stringify(fetchImpl.mock.calls)).not.toContain("api-jwt");
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    }
  });
});
