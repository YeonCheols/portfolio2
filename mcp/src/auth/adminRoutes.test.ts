import http from "http";

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
  const createServer = (fetchImpl: typeof fetch, oauth = defaultOAuth) =>
    http.createServer((req, res) => {
      void handleAdminRequest(req, res, {
        api: createPortfolioAdminApi({ baseUrl: apiUrl, fetchImpl }),
        oauth,
        publicUrl: "https://mcp.example.test/mcp",
        oauthResource: "https://mcp.example.test/mcp",
      }).then((handled) => {
        if (!handled) {
          res.writeHead(404);
          res.end();
        }
      });
    });

  beforeEach(() => {
    defaultOAuth.startAuthorization.mockClear();
    defaultOAuth.exchangeCode.mockClear();
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

  it("관리 UI 스크립트를 동일 출처 전용 헤더로 제공한다", async () => {
    const server = createServer(jest.fn());
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    const port = (server.address() as { port: number }).port;
    try {
      const response = await request(
        port,
        "/admin/ai-models/assets/admin-ai-models.js",
      );
      expect(response.status).toBe(200);
      expect(response.headers["content-type"]).toContain("javascript");
      expect(response.body).toContain("/admin/ai-models/api/settings");
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    }
  });

  it("관리 UI 스타일시트를 빌드 산출물 경로에서 제공한다", async () => {
    const server = createServer(jest.fn());
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    const port = (server.address() as { port: number }).port;
    try {
      const response = await request(port, "/admin/ai-models/assets/admin.css");
      expect(response.status).toBe(200);
      expect(response.headers["content-type"]).toContain("text/css");
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    }
  });

  it("인증된 대시보드 CSP에서 동일 출처 설정 API 요청을 허용한다", async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ user: { id: 1, email: "admin@example.com" } }),
    });
    const server = createServer(fetchImpl);
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    const port = (server.address() as { port: number }).port;
    try {
      const response = await request(port, "/admin/ai-models", {
        headers: { cookie: "__Host-portfolio-admin-session=admin-jwt" },
      });
      expect(response.status).toBe(200);
      expect(response.headers["content-security-policy"]).toContain(
        "connect-src 'self'",
      );
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    }
  });

  it("모델 설정 프록시는 인증된 세션의 요청을 portfolio-api로 전달한다", async () => {
    const fetchImpl = jest
      .fn()
      .mockResolvedValue({ ok: true, status: 200, json: async () => [] });
    const server = createServer(fetchImpl);
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    const port = (server.address() as { port: number }).port;
    try {
      const response = await request(port, "/admin/ai-models/api/settings", {
        headers: { cookie: "__Host-portfolio-admin-session=api-jwt" },
      });
      expect(response.status).toBe(200);
      expect(fetchImpl).toHaveBeenCalledWith(
        `${apiUrl}/mcp/admin/resume-model-setting`,
        expect.objectContaining({
          headers: expect.objectContaining({ authorization: "Bearer api-jwt" }),
        }),
      );
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    }
  });
});
