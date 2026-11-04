import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "fs";
import http from "http";
import { tmpdir } from "os";
import { join } from "path";

import { createPortfolioAdminApi } from "@mcp/auth/adminApi";
import { adminPagePaths } from "@mcp/auth/adminMenu";
import { handleAdminRequest } from "@mcp/auth/adminRoutes";
import type { SettingConnectionTester } from "@mcp/auth/settingConnectionTest";
import {
  ArchiveNotFoundError,
  ArchiveQueryError,
  type ResumeDebugArchiveReader,
} from "@mcp/resume/output/resumeDebugArchiveReader";
import { ArchiveBusyError } from "@mcp/resume/output/reproduceResumeArchive";
import {
  ArchiveDeleteError,
  ArchiveRevisionError,
} from "@mcp/resume/output/resumeDebugArchiveWriter";
import type { IntrospectedSession } from "@mcp/resume/http/portfolioApiIntrospector";

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
    introspect: (token: string) => Promise<IntrospectedSession> = jest
      .fn()
      .mockResolvedValue({ active: true, sub: "7" }),
    log?: (message: string) => void,
    testSetting?: SettingConnectionTester,
    debugArchive?: ResumeDebugArchiveReader,
  ) =>
    http.createServer((req, res) => {
      handleAdminRequest(req, res, {
        api: createPortfolioAdminApi({
          baseUrl: apiUrl,
          serviceToken: "service-token",
          fetchImpl,
        }),
        introspect,
        log,
        testSetting,
        debugArchive,
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
      expect(response.headers.location).toBe("/admin");
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
    const introspect = jest.fn().mockResolvedValue({ active: true, sub: "7" });
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
    const introspect = jest.fn().mockResolvedValue({ active: false });
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
      expect(response.headers.location).toBe(
        "/admin/ai-models/connect?next=%2Fadmin%2Fai-models",
      );
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
    const introspect = jest.fn().mockResolvedValue({ active: true, sub: "7" });
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
    const introspect = jest.fn().mockResolvedValue({ active: false });
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

  it("설정을 바꾸는 요청이 성공하면 변경자 sub와 요청 정보를 로그로 남기고 토큰·본문은 남기지 않는다", async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id: 3 }),
    });
    const log = jest.fn();
    const server = createServer(
      fetchImpl,
      defaultOAuth,
      appRoot,
      jest.fn().mockResolvedValue({ active: true, sub: "7" }),
      log,
    );
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    const port = (server.address() as { port: number }).port;
    try {
      await request(port, "/admin/ai-models/api/settings/3", {
        method: "PUT",
        body: JSON.stringify({ modelName: "secret-model-name" }),
        headers: {
          cookie: "__Host-portfolio-admin-session=api-jwt",
          origin: "https://mcp.example.test",
          "content-type": "application/json",
        },
      });

      expect(log).toHaveBeenCalledTimes(1);
      const line = log.mock.calls[0][0] as string;
      expect(line).toContain("ADMIN_SETTING_CHANGE");
      expect(line).toContain("sub=7");
      expect(line).toContain("method=PUT");
      expect(line).toContain("path=/service/resume-model-setting/3");
      expect(line).toContain("result=ok");
      expect(line).not.toContain("api-jwt");
      expect(line).not.toContain("secret-model-name");
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    }
  });

  it("portfolio-api 호출이 실패한 변경 시도도 로그로 남기고 읽기 요청은 남기지 않는다", async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ message: "internal" }),
    });
    const log = jest.fn();
    const server = createServer(
      fetchImpl,
      defaultOAuth,
      appRoot,
      jest.fn().mockResolvedValue({ active: true, sub: "7" }),
      log,
    );
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    const port = (server.address() as { port: number }).port;
    const headers = {
      cookie: "__Host-portfolio-admin-session=api-jwt",
      origin: "https://mcp.example.test",
    };
    try {
      await request(port, "/admin/ai-models/api/settings", { headers });
      expect(log).not.toHaveBeenCalled();

      await request(port, "/admin/ai-models/api/settings/3", {
        method: "DELETE",
        headers,
      });
      expect(log).toHaveBeenCalledTimes(1);
      const line = log.mock.calls[0][0] as string;
      expect(line).toContain("sub=7");
      expect(line).toContain("method=DELETE");
      expect(line).toContain("result=failed");
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    }
  });

  it("sub에 줄바꿈 같은 문자가 있으면 로그에 그대로 쓰지 않고 unknown으로 기록한다", async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id: 3 }),
    });
    const log = jest.fn();
    const server = createServer(
      fetchImpl,
      defaultOAuth,
      appRoot,
      jest.fn().mockResolvedValue({
        active: true,
        sub: "7\nADMIN_SETTING_CHANGE sub=1 result=ok",
      }),
      log,
    );
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    const port = (server.address() as { port: number }).port;
    try {
      await request(port, "/admin/ai-models/api/settings/3/activate", {
        method: "POST",
        headers: {
          cookie: "__Host-portfolio-admin-session=api-jwt",
          origin: "https://mcp.example.test",
        },
      });

      const line = log.mock.calls[0][0] as string;
      expect(line).toContain("sub=unknown");
      expect(line).not.toMatch(/[\r\n]/);
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    }
  });

  describe("설정별 연결 테스트 경로", () => {
    const testPath = "/admin/ai-models/api/settings/3/test";
    const sessionCookie = "__Host-portfolio-admin-session=api-jwt";
    const sameOrigin = "https://mcp.example.test";
    const postTest = (
      port: number,
      options: { headers?: Record<string, string>; body?: string } = {},
    ) =>
      request(port, testPath, {
        method: "POST",
        body: options.body ?? JSON.stringify({ environment: "production" }),
        headers: {
          cookie: sessionCookie,
          origin: sameOrigin,
          "content-type": "application/json",
          ...options.headers,
        },
      });
    const withServer = async (
      config: {
        testSetting?: SettingConnectionTester;
        introspect?: (token: string) => Promise<IntrospectedSession>;
        log?: (message: string) => void;
      },
      run: (port: number) => Promise<void>,
    ) => {
      const server = createServer(
        jest.fn(),
        defaultOAuth,
        appRoot,
        config.introspect,
        config.log,
        config.testSetting,
      );
      await new Promise<void>((resolve) =>
        server.listen(0, "127.0.0.1", resolve),
      );
      try {
        await run((server.address() as { port: number }).port);
      } finally {
        await new Promise<void>((resolve, reject) =>
          server.close((error) => (error ? reject(error) : resolve())),
        );
      }
    };

    it("세션과 같은 출처를 확인한 뒤 선택한 id와 환경으로 연결 테스트를 실행하고 결과만 반환한다", async () => {
      const testSetting = jest
        .fn()
        .mockResolvedValue({ ok: true, latencyMs: 120 });
      const introspect = jest
        .fn()
        .mockResolvedValue({ active: true, sub: "7" });

      await withServer({ testSetting, introspect }, async (port) => {
        const response = await postTest(port);

        expect(response.status).toBe(200);
        expect(JSON.parse(response.body)).toEqual({ ok: true, latencyMs: 120 });
        expect(introspect).toHaveBeenCalledWith("api-jwt");
        expect(testSetting).toHaveBeenCalledWith({
          id: 3,
          environment: "production",
        });
      });
    });

    it("환경이 없거나 알 수 없는 값이거나 JSON이 아니면 400으로 거절하고 테스트를 실행하지 않는다", async () => {
      const testSetting = jest.fn();

      await withServer({ testSetting }, async (port) => {
        for (const body of [
          "",
          "not json",
          "null",
          "{}",
          JSON.stringify({ environment: "staging" }),
          JSON.stringify({ environment: 1 }),
        ]) {
          const response = await postTest(port, { body });

          expect(response.status).toBe(400);
          expect(JSON.parse(response.body).code).toBe("INVALID_REQUEST");
        }
        expect(testSetting).not.toHaveBeenCalled();
      });
    });

    it("테스트 실행이 예외로 끝나면 502로 응답하고 내부 정보를 숨긴다", async () => {
      const testSetting = jest
        .fn()
        .mockRejectedValue(new Error("secret-key https://internal.example"));

      await withServer({ testSetting }, async (port) => {
        const response = await postTest(port);

        expect(response.status).toBe(502);
        expect(JSON.parse(response.body)).toEqual({
          ok: false,
          code: "UPSTREAM_FAILED",
        });
        expect(response.body).not.toContain("secret-key");
      });
    });

    it("실행 결과를 ADMIN_MODEL_TEST로 남기고 설정 변경 로그나 키·오류 원문은 남기지 않는다", async () => {
      const log = jest.fn();
      const testSetting = jest
        .fn()
        .mockResolvedValueOnce({ ok: true, latencyMs: 120 })
        .mockResolvedValueOnce({ ok: false, code: "MODEL_REJECTED" });

      await withServer({ testSetting, log }, async (port) => {
        await postTest(port);
        await postTest(port);
      });

      expect(log.mock.calls.map(([line]) => line)).toEqual([
        "ADMIN_MODEL_TEST sub=7 id=3 environment=production result=ok",
        "ADMIN_MODEL_TEST sub=7 id=3 environment=production result=failed code=MODEL_REJECTED",
      ]);
      expect(JSON.stringify(log.mock.calls)).not.toContain(
        "ADMIN_SETTING_CHANGE",
      );
    });

    it("테스트 실행이 예외로 끝나도 시도를 ADMIN_MODEL_TEST로 남기고 원본 오류는 남기지 않는다", async () => {
      const log = jest.fn();
      const testSetting = jest
        .fn()
        .mockRejectedValue(new Error("secret-key leaked"));

      await withServer({ testSetting, log }, async (port) => {
        await postTest(port);
      });

      expect(log.mock.calls.map(([line]) => line)).toEqual([
        "ADMIN_MODEL_TEST sub=7 id=3 environment=production result=failed code=UPSTREAM_FAILED",
      ]);
      expect(JSON.stringify(log.mock.calls)).not.toContain("secret-key");
    });

    it("쿠키가 없거나 출처가 다르거나 세션이 무효이거나 메서드가 다르면 테스트를 실행하지 않는다", async () => {
      const testSetting = jest.fn();

      await withServer({ testSetting }, async (port) => {
        const noCookie = await postTest(port, { headers: { cookie: "" } });
        const otherOrigin = await postTest(port, {
          headers: { origin: "https://evil.example.test" },
        });
        const noOrigin = await postTest(port, { headers: { origin: "" } });
        const get = await request(port, testPath, {
          headers: { cookie: sessionCookie },
        });

        expect(noCookie.status).toBe(401);
        expect(otherOrigin.status).toBe(403);
        expect(noOrigin.status).toBe(403);
        expect(get.status).toBe(405);
      });

      await withServer(
        {
          testSetting,
          introspect: jest.fn().mockResolvedValue({ active: false }),
        },
        async (port) => {
          expect((await postTest(port)).status).toBe(401);
        },
      );
      await withServer(
        {
          testSetting,
          introspect: jest.fn().mockRejectedValue(new Error("TIMEOUT")),
        },
        async (port) => {
          expect((await postTest(port)).status).toBe(503);
        },
      );

      expect(testSetting).not.toHaveBeenCalled();
    });

    it("요청 본문이 너무 크면 413으로 거절하고 테스트를 실행하지 않는다", async () => {
      const testSetting = jest.fn();

      await withServer({ testSetting }, async (port) => {
        const response = await postTest(port, {
          body: JSON.stringify({
            environment: "production",
            pad: "x".repeat(40_000),
          }),
        });

        expect(response.status).toBe(413);
        expect(JSON.parse(response.body).code).toBe("BODY_TOO_LARGE");
        expect(testSetting).not.toHaveBeenCalled();
      });
    });
  });
  describe("이력서 디버깅 아카이브 경로", () => {
    const session = { cookie: "__Host-portfolio-admin-session=admin-jwt" };
    const sameOrigin = { origin: "https://mcp.example.test" };
    const makeReader = () => ({
      list: jest.fn().mockResolvedValue({
        items: [{ attemptId: "att-1" }],
        hasMore: false,
      }),
      get: jest.fn(),
      signedUrl: jest.fn(),
      listRevisions: jest.fn(),
      getRevision: jest.fn(),
      saveRevision: jest.fn(),
      removeAttempt: jest.fn(),
      reproduce: jest.fn(),
      listReproductions: jest.fn(),
    });
    const active = () =>
      jest.fn().mockResolvedValue({ active: true, sub: "7" });
    const withServer = async (
      options: {
        reader?: ReturnType<typeof makeReader>;
        introspect?: (token: string) => Promise<IntrospectedSession>;
        log?: (message: string) => void;
      },
      run: (port: number) => Promise<void>,
    ) => {
      const server = createServer(
        jest.fn(),
        defaultOAuth,
        appRoot,
        options.introspect ?? active(),
        options.log,
        undefined,
        options.reader as unknown as ResumeDebugArchiveReader | undefined,
      );
      await new Promise<void>((resolve) =>
        server.listen(0, "127.0.0.1", resolve),
      );
      try {
        await run((server.address() as { port: number }).port);
      } finally {
        await new Promise<void>((resolve, reject) =>
          server.close((error) => (error ? reject(error) : resolve())),
        );
      }
    };

    it("화면은 기존 관리자 세션을 확인해 앱을 서빙하고 세션이 없거나 무효이면 로그인으로 보낸다", async () => {
      const introspect = active();
      await withServer({ reader: makeReader(), introspect }, async (port) => {
        const noCookie = await request(port, "/admin/debug/resume");
        expect(noCookie.status).toBe(303);
        expect(noCookie.headers.location).toBe(
          "/admin/ai-models/connect?next=%2Fadmin%2Fdebug%2Fresume",
        );

        const ok = await request(port, "/admin/debug/resume", {
          headers: session,
        });
        expect(ok.status).toBe(200);
        expect(ok.body).toBe(indexHtml);
        expect(introspect).toHaveBeenCalledWith("admin-jwt");
      });
      await withServer(
        {
          reader: makeReader(),
          introspect: jest.fn().mockResolvedValue({ active: false }),
        },
        async (port) => {
          const inactive = await request(port, "/admin/debug/resume", {
            headers: session,
          });
          expect(inactive.status).toBe(303);
          expect(inactive.headers.location).toBe(
            "/admin/ai-models/connect?next=%2Fadmin%2Fdebug%2Fresume",
          );
          expect(String(inactive.headers["set-cookie"])).toContain("Max-Age=0");
        },
      );
      await withServer(
        {
          reader: makeReader(),
          introspect: jest.fn().mockRejectedValue(new Error("down")),
        },
        async (port) => {
          const down = await request(port, "/admin/debug/resume", {
            headers: session,
          });
          expect(down.status).toBe(503);
          expect(down.headers["set-cookie"]).toBeUndefined();
        },
      );
    });

    it("목록 API는 세션 없음·무효·확인 실패·허용하지 않은 메서드를 저장소 호출 없이 거절한다", async () => {
      const reader = makeReader();
      const path = "/admin/debug/resume/api/archives?environment=development";
      await withServer({ reader }, async (port) => {
        expect((await request(port, path)).status).toBe(401);
        const post = await request(port, path, {
          method: "POST",
          headers: { ...session, ...sameOrigin },
        });
        expect(post.status).toBe(405);
        const crossOrigin = await request(port, path, {
          method: "POST",
          headers: { ...session, origin: "https://evil.example.test" },
        });
        expect(crossOrigin.status).toBe(403);
      });
      await withServer(
        {
          reader,
          introspect: jest.fn().mockResolvedValue({ active: false }),
        },
        async (port) => {
          const response = await request(port, path, { headers: session });
          expect(response.status).toBe(401);
        },
      );
      await withServer(
        { reader, introspect: jest.fn().mockRejectedValue(new Error("down")) },
        async (port) => {
          const response = await request(port, path, { headers: session });
          expect(response.status).toBe(503);
        },
      );
      expect(reader.list).not.toHaveBeenCalled();
    });

    it("목록 API는 쿼리를 reader에 넘기고 잘못된 입력은 400, 저장소 오류는 내부 정보 없이 502로 응답한다", async () => {
      const reader = makeReader();
      await withServer({ reader }, async (port) => {
        const response = await request(
          port,
          "/admin/debug/resume/api/archives?environment=development&generationId=gen-1&attemptId=&failedStage=validation&page=2&pageSize=10",
          { headers: session },
        );
        expect(response.status).toBe(200);
        expect(JSON.parse(response.body)).toEqual({
          ok: true,
          items: [{ attemptId: "att-1" }],
          hasMore: false,
        });
        expect(reader.list).toHaveBeenCalledWith({
          environment: "development",
          generationId: "gen-1",
          failedStage: "validation",
          page: 2,
          pageSize: 10,
        });

        reader.list.mockRejectedValueOnce(new ArchiveQueryError());
        const invalid = await request(
          port,
          "/admin/debug/resume/api/archives?environment=staging",
          { headers: session },
        );
        expect(invalid.status).toBe(400);
        expect(JSON.parse(invalid.body)).toEqual({
          ok: false,
          code: "INVALID_REQUEST",
        });

        reader.list.mockRejectedValueOnce(new Error("leak sb_secret_fake"));
        const failed = await request(
          port,
          "/admin/debug/resume/api/archives?environment=development",
          { headers: session },
        );
        expect(failed.status).toBe(502);
        expect(failed.body).not.toContain("sb_secret_fake");
        expect(JSON.parse(failed.body)).toEqual({
          ok: false,
          code: "STORAGE_FAILED",
        });
      });
    });

    it("상세 API는 대상 키를 reader에 넘기고 없는 실행은 404, 잘못된 키는 400으로 응답한다", async () => {
      const reader = makeReader();
      const detail = {
        summary: { attemptId: "att-1" },
        files: [{ name: "001-started.json", stage: "started" }],
        latest: { response: "{끊긴 JSON" },
      };
      reader.get.mockResolvedValueOnce(detail);
      const query =
        "environment=development&subjectHash=subj-a&generationId=gen-1&attemptId=att-1";
      await withServer({ reader }, async (port) => {
        const response = await request(
          port,
          `/admin/debug/resume/api/archives/detail?${query}`,
          { headers: session },
        );
        expect(response.status).toBe(200);
        expect(JSON.parse(response.body)).toEqual({ ok: true, ...detail });
        expect(reader.get).toHaveBeenCalledWith({
          environment: "development",
          subjectHash: "subj-a",
          generationId: "gen-1",
          attemptId: "att-1",
        });

        reader.get.mockRejectedValueOnce(new ArchiveNotFoundError());
        const missing = await request(
          port,
          `/admin/debug/resume/api/archives/detail?${query}`,
          { headers: session },
        );
        expect(missing.status).toBe(404);
        expect(JSON.parse(missing.body).code).toBe("ARCHIVE_NOT_FOUND");

        reader.get.mockRejectedValueOnce(new ArchiveQueryError());
        const invalid = await request(
          port,
          "/admin/debug/resume/api/archives/detail?environment=development",
          { headers: session },
        );
        expect(invalid.status).toBe(400);
      });
    });

    it("서명 URL API는 파일 이름을 reader에 넘겨 만료되는 URL만 응답하고 없는 파일은 404로 응답한다", async () => {
      const reader = makeReader();
      reader.signedUrl.mockResolvedValueOnce(
        "https://storage.example.test/sign/x?token=fake",
      );
      const query =
        "environment=development&subjectHash=subj-a&generationId=gen-1&attemptId=att-1&file=002-model_response.json";
      await withServer({ reader }, async (port) => {
        const response = await request(
          port,
          `/admin/debug/resume/api/archives/file-url?${query}`,
          { headers: session },
        );
        expect(response.status).toBe(200);
        expect(JSON.parse(response.body)).toEqual({
          ok: true,
          url: "https://storage.example.test/sign/x?token=fake",
        });
        expect(reader.signedUrl).toHaveBeenCalledWith(
          {
            environment: "development",
            subjectHash: "subj-a",
            generationId: "gen-1",
            attemptId: "att-1",
          },
          "002-model_response.json",
        );

        reader.signedUrl.mockRejectedValueOnce(new ArchiveNotFoundError());
        const missing = await request(
          port,
          `/admin/debug/resume/api/archives/file-url?${query}`,
          { headers: session },
        );
        expect(missing.status).toBe(404);
      });
    });

    it("읽기 요청도 sub와 동작·결과만 로그로 남기고 ID와 서명 URL은 남기지 않는다", async () => {
      const reader = makeReader();
      reader.get
        .mockResolvedValueOnce({ summary: {}, files: [], latest: null })
        .mockRejectedValueOnce(new ArchiveNotFoundError());
      reader.signedUrl.mockResolvedValueOnce(
        "https://storage.example.test/sign/x?token=fake",
      );
      reader.list
        .mockResolvedValueOnce({ items: [], hasMore: false })
        .mockRejectedValueOnce(new Error("leak sb_secret_fake"));
      const log = jest.fn();
      const key =
        "environment=development&subjectHash=subj-a&generationId=gen-1&attemptId=att-1";
      const api = "/admin/debug/resume/api/archives";
      await withServer({ reader, log }, async (port) => {
        // 세션이 없는 요청은 누구의 행위도 아니므로 남기지 않는다
        await request(port, `${api}?environment=development`);
        for (const path of [
          `${api}?environment=development`,
          `${api}/detail?${key}`,
          `${api}/file-url?${key}&file=002-model_response.json`,
          `${api}/detail?${key}`,
          `${api}?environment=development`,
        ]) {
          await request(port, path, { headers: session });
        }
      });

      expect(log.mock.calls.map(([message]) => message)).toEqual([
        "ADMIN_DEBUG_ARCHIVE sub=7 action=list result=ok",
        "ADMIN_DEBUG_ARCHIVE sub=7 action=detail result=ok",
        "ADMIN_DEBUG_ARCHIVE sub=7 action=file-url result=ok",
        "ADMIN_DEBUG_ARCHIVE sub=7 action=detail result=failed code=ARCHIVE_NOT_FOUND",
        "ADMIN_DEBUG_ARCHIVE sub=7 action=list result=failed code=STORAGE_FAILED",
      ]);
      const logged = log.mock.calls.map(([message]) => message).join("\n");
      for (const secret of [
        "gen-1",
        "att-1",
        "subj-a",
        "token=fake",
        "sb_secret",
      ])
        expect(logged).not.toContain(secret);
    });

    const keyBody = {
      environment: "development",
      subjectHash: "subj-a",
      generationId: "gen-1",
      attemptId: "att-1",
    };
    const post = (
      port: number,
      path: string,
      body: unknown,
      headers: Record<string, string> = { ...session, ...sameOrigin },
    ) =>
      request(port, `/admin/debug/resume/api/archives/${path}`, {
        method: "POST",
        headers: { "content-type": "application/json", ...headers },
        body: typeof body === "string" ? body : JSON.stringify(body),
      });

    it("수정본 저장은 같은 출처 POST만 받아 입력을 서비스에 넘기고 검증 실패는 코드로, 잘못된 본문은 400으로 응답한다", async () => {
      const reader = makeReader();
      reader.saveRevision.mockResolvedValueOnce({ revisionId: "rev-1" });
      const input = {
        ...keyBody,
        baseFile: "004-failed.json",
        request: { persona: "p", prompt: "q" },
        response: '{"claims":[]}',
      };
      await withServer({ reader }, async (port) => {
        const saved = await post(port, "revisions", input);
        expect(saved.status).toBe(200);
        expect(JSON.parse(saved.body)).toEqual({
          ok: true,
          revisionId: "rev-1",
        });
        expect(reader.saveRevision).toHaveBeenCalledWith(keyBody, {
          baseFile: "004-failed.json",
          request: input.request,
          response: input.response,
        });

        reader.saveRevision.mockRejectedValueOnce(
          new ArchiveRevisionError("UNKNOWN_SOURCE_REF"),
        );
        const rejected = await post(port, "revisions", input);
        expect(rejected.status).toBe(422);
        expect(JSON.parse(rejected.body)).toEqual({
          ok: false,
          code: "UNKNOWN_SOURCE_REF",
        });

        expect((await post(port, "revisions", "{깨진")).status).toBe(400);
        const crossOrigin = await post(port, "revisions", input, {
          ...session,
          origin: "https://evil.example.test",
        });
        expect(crossOrigin.status).toBe(403);
        expect(
          (
            await request(
              port,
              `/admin/debug/resume/api/archives/revisions?${new URLSearchParams(keyBody)}`,
              { headers: session },
            )
          ).status,
        ).toBe(200);
      });
      expect(reader.saveRevision).toHaveBeenCalledTimes(2);
    });

    it("수정본 목록과 단건 조회는 실행 키로 서비스를 부른다", async () => {
      const reader = makeReader();
      reader.listRevisions.mockResolvedValueOnce([{ revisionId: "rev-1" }]);
      reader.getRevision.mockResolvedValueOnce({ response: "저장된 응답" });
      const query = new URLSearchParams(keyBody).toString();
      await withServer({ reader }, async (port) => {
        const list = await request(
          port,
          `/admin/debug/resume/api/archives/revisions?${query}`,
          { headers: session },
        );
        expect(JSON.parse(list.body)).toEqual({
          ok: true,
          items: [{ revisionId: "rev-1" }],
        });
        const one = await request(
          port,
          `/admin/debug/resume/api/archives/revision?${query}&revisionId=rev-1`,
          { headers: session },
        );
        expect(JSON.parse(one.body)).toEqual({
          ok: true,
          revision: { response: "저장된 응답" },
        });
        expect(reader.getRevision).toHaveBeenCalledWith(keyBody, "rev-1");
      });
    });

    it("재현 요청은 실행 키·원본·동작을 넘기고 PDF는 base64로 돌려주며 중복 실행은 409로 알린다", async () => {
      const reader = makeReader();
      const record = { reproductionId: "rep-1", status: "completed" };
      reader.reproduce
        .mockResolvedValueOnce({ record, pdf: Buffer.from("%PDF-fake") })
        .mockResolvedValueOnce({ record: { ...record, status: "failed" } })
        .mockRejectedValueOnce(new ArchiveBusyError());
      const input = {
        ...keyBody,
        source: { kind: "revision", revisionId: "rev-1" },
        action: "pdf",
      };
      await withServer({ reader }, async (port) => {
        const pdf = await post(port, "reproductions", input);
        expect(pdf.status).toBe(200);
        expect(JSON.parse(pdf.body)).toEqual({
          ok: true,
          record,
          pdfBase64: Buffer.from("%PDF-fake").toString("base64"),
        });
        expect(reader.reproduce).toHaveBeenCalledWith(keyBody, {
          source: input.source,
          action: "pdf",
        });

        const failed = await post(port, "reproductions", input);
        expect(failed.status).toBe(200);
        expect(JSON.parse(failed.body).record.status).toBe("failed");
        expect(JSON.parse(failed.body)).not.toHaveProperty("pdfBase64");

        const busy = await post(port, "reproductions", input);
        expect(busy.status).toBe(409);
        expect(JSON.parse(busy.body).code).toBe("REPRODUCTION_IN_PROGRESS");
      });
    });

    it("삭제는 확인 값을 함께 받아 일부 실패와 확인 불일치를 성공으로 응답하지 않는다", async () => {
      const reader = makeReader();
      reader.removeAttempt
        .mockResolvedValueOnce({ removed: 6 })
        .mockRejectedValueOnce(new ArchiveDeleteError("CONFIRMATION_MISMATCH"))
        .mockRejectedValueOnce(new ArchiveDeleteError("DELETE_PARTIAL", 5, 1))
        .mockRejectedValueOnce(new ArchiveNotFoundError());
      await withServer({ reader }, async (port) => {
        const ok = await post(port, "delete", { ...keyBody, confirm: "att-1" });
        expect(JSON.parse(ok.body)).toEqual({ ok: true, removed: 6 });
        expect(reader.removeAttempt).toHaveBeenCalledWith(keyBody, "att-1");

        const mismatch = await post(port, "delete", {
          ...keyBody,
          confirm: "x",
        });
        expect(mismatch.status).toBe(400);
        expect(JSON.parse(mismatch.body).code).toBe("CONFIRMATION_MISMATCH");

        const partial = await post(port, "delete", {
          ...keyBody,
          confirm: "att-1",
        });
        expect(partial.status).toBe(502);
        expect(JSON.parse(partial.body)).toEqual({
          ok: false,
          code: "DELETE_PARTIAL",
          removed: 5,
          remaining: 1,
        });

        expect(
          (await post(port, "delete", { ...keyBody, confirm: "att-1" })).status,
        ).toBe(404);
        const noOrigin = await post(
          port,
          "delete",
          { ...keyBody, confirm: "att-1" },
          session,
        );
        expect(noOrigin.status).toBe(403);
      });
      expect(reader.removeAttempt).toHaveBeenCalledTimes(4);
    });

    it("수정본 저장·재현·삭제도 sub와 동작·결과 코드만 로그로 남기고 입력 값은 남기지 않는다", async () => {
      const reader = makeReader();
      reader.saveRevision.mockResolvedValueOnce({ revisionId: "rev-secret" });
      reader.reproduce.mockRejectedValueOnce(new ArchiveBusyError());
      reader.removeAttempt.mockRejectedValueOnce(
        new ArchiveDeleteError("DELETE_PARTIAL", 5, 1),
      );
      const log = jest.fn();
      await withServer({ reader, log }, async (port) => {
        await post(port, "revisions", {
          ...keyBody,
          baseFile: "004-failed.json",
          response: "비밀 응답 본문",
        });
        await post(port, "reproductions", {
          ...keyBody,
          source: { kind: "original" },
          action: "pdf",
        });
        await post(port, "delete", { ...keyBody, confirm: "att-1" });
      });

      expect(log.mock.calls.map(([message]) => message)).toEqual([
        "ADMIN_DEBUG_ARCHIVE sub=7 action=revise result=ok",
        "ADMIN_DEBUG_ARCHIVE sub=7 action=reproduce result=failed code=REPRODUCTION_IN_PROGRESS",
        "ADMIN_DEBUG_ARCHIVE sub=7 action=delete result=failed code=DELETE_PARTIAL",
      ]);
      const logged = log.mock.calls.map(([message]) => message).join("\n");
      for (const value of ["rev-secret", "비밀 응답", "att-1", "subj-a"])
        expect(logged).not.toContain(value);
    });

    it("저장소가 설정되지 않았으면 인증 후 503으로 알린다", async () => {
      await withServer({}, async (port) => {
        const response = await request(
          port,
          "/admin/debug/resume/api/archives?environment=development",
          { headers: session },
        );
        expect(response.status).toBe(503);
        expect(JSON.parse(response.body)).toEqual({
          ok: false,
          code: "DEBUG_ARCHIVE_UNAVAILABLE",
        });
      });
    });
  });
  describe("로그인 후 원래 화면으로 복귀", () => {
    const serve = async (
      introspect: (token: string) => Promise<IntrospectedSession>,
      run: (port: number) => Promise<void>,
    ) => {
      const server = createServer(jest.fn(), defaultOAuth, appRoot, introspect);
      await new Promise<void>((resolve) =>
        server.listen(0, "127.0.0.1", resolve),
      );
      try {
        await run((server.address() as { port: number }).port);
      } finally {
        await new Promise<void>((resolve, reject) =>
          server.close((error) => (error ? reject(error) : resolve())),
        );
      }
    };
    const stateCookieOf = (setCookie: string[] | undefined) => {
      const value = setCookie?.[0]?.match(/oauth-state=([^;]+)/)?.[1] ?? "";
      return JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as {
        next?: string;
      };
    };
    const oauthStateCookie = (next?: string) =>
      "__Host-portfolio-admin-oauth-state=" +
      Buffer.from(
        JSON.stringify({
          state: "random-state",
          clientId: "oauth-client",
          codeVerifier: "v".repeat(43),
          redirectUri:
            "https://mcp.example.test/admin/ai-models/oauth/callback",
          resource: "https://mcp.example.test/mcp",
          ...(next === undefined ? {} : { next }),
        }),
      ).toString("base64url");
    const callback = (port: number, next?: string) =>
      request(
        port,
        "/admin/ai-models/oauth/callback?code=auth-code&state=random-state",
        { headers: { cookie: oauthStateCookie(next) } },
      );

    it("디버깅 화면이 로그인으로 보낼 때 가려던 경로를 next로 싣고 모델 관리는 그대로 둔다", async () => {
      const wanted = "/admin/debug/resume?environment=production&page=2";
      const next = `/admin/ai-models/connect?next=${encodeURIComponent(wanted)}`;
      await serve(
        jest.fn().mockResolvedValue({ active: false }),
        async (port) => {
          const anonymous = await request(port, wanted);
          expect(anonymous.status).toBe(303);
          expect(anonymous.headers.location).toBe(next);

          const expired = await request(port, wanted, {
            headers: { cookie: "__Host-portfolio-admin-session=old" },
          });
          expect(expired.headers.location).toBe(next);
          expect(String(expired.headers["set-cookie"])).toContain("Max-Age=0");

          // 모델 관리도 이제 기본 이동지가 아니므로 가려던 경로를 싣는다
          const settings = await request(port, "/admin/ai-models");
          expect(settings.headers.location).toBe(
            "/admin/ai-models/connect?next=%2Fadmin%2Fai-models",
          );
        },
      );
    });

    it("로그인 시작은 허용한 관리 화면 경로만 상태 쿠키에 담고 외부·다른 경로는 버린다", async () => {
      await serve(jest.fn(), async (port) => {
        const start = (next: string) =>
          request(
            port,
            `/admin/ai-models/oauth/start?next=${encodeURIComponent(next)}`,
            {
              method: "POST",
              headers: { origin: "https://mcp.example.test" },
            },
          );
        const detail =
          "/admin/debug/resume?environment=development&subjectHash=s&generationId=g&attemptId=a";
        expect(
          stateCookieOf((await start(detail)).headers["set-cookie"]),
        ).toMatchObject({
          next: detail,
        });
        for (const rejected of [
          "//evil.example.test/admin/debug/resume",
          "https://evil.example.test/admin/debug/resume",
          "/\\evil.example.test",
          "/admin/ai-models/oauth/callback",
          "/admin/debug/resume/../../x",
          "/admin/other",
          `/admin/debug/resume?${"a".repeat(700)}`,
        ]) {
          const response = await start(rejected);
          expect(response.status).toBe(303);
          expect(
            stateCookieOf(response.headers["set-cookie"]).next,
          ).toBeUndefined();
        }
      });
    });

    it("콜백은 저장된 경로가 허용 목록에 있을 때만 거기로 보내고 아니면 메뉴로 보낸다", async () => {
      await serve(jest.fn(), async (port) => {
        const wanted = "/admin/debug/resume?environment=production";
        expect((await callback(port, wanted)).headers.location).toBe(wanted);
        expect((await callback(port)).headers.location).toBe("/admin");
        // 쿠키 값이 바뀌어 외부 주소가 들어와도 따라가지 않는다
        for (const tampered of [
          "https://evil.example.test/",
          "//evil.example.test",
          "/admin/other",
        ]) {
          expect((await callback(port, tampered)).headers.location).toBe(
            "/admin",
          );
        }
      });
    });
  });
  describe("관리 메뉴 화면과 로그인 기본 이동", () => {
    const serve = async (
      introspect: (token: string) => Promise<IntrospectedSession>,
      run: (port: number) => Promise<void>,
    ) => {
      const server = createServer(jest.fn(), defaultOAuth, appRoot, introspect);
      await new Promise<void>((resolve) =>
        server.listen(0, "127.0.0.1", resolve),
      );
      try {
        await run((server.address() as { port: number }).port);
      } finally {
        await new Promise<void>((resolve, reject) =>
          server.close((error) => (error ? reject(error) : resolve())),
        );
      }
    };
    const session = { cookie: "__Host-portfolio-admin-session=admin-jwt" };

    it("/admin은 세션을 확인해 앱을 서빙하고 세션이 없거나 무효면 next 없이 로그인으로 보낸다", async () => {
      const introspect = jest
        .fn()
        .mockResolvedValue({ active: true, sub: "7" });
      await serve(introspect, async (port) => {
        for (const path of ["/admin", "/admin/"]) {
          const anonymous = await request(port, path);
          expect(anonymous.status).toBe(303);
          expect(anonymous.headers.location).toBe("/admin/ai-models/connect");

          const ok = await request(port, path, { headers: session });
          expect(ok.status).toBe(200);
          expect(ok.body).toBe(indexHtml);
        }
        expect(introspect).toHaveBeenCalledWith("admin-jwt");
      });
      await serve(
        jest.fn().mockResolvedValue({ active: false }),
        async (port) => {
          const expired = await request(port, "/admin", { headers: session });
          expect(expired.headers.location).toBe("/admin/ai-models/connect");
          expect(String(expired.headers["set-cookie"])).toContain("Max-Age=0");
        },
      );
      await serve(
        jest.fn().mockRejectedValue(new Error("down")),
        async (port) => {
          const down = await request(port, "/admin", { headers: session });
          expect(down.status).toBe(503);
          expect(down.headers["set-cookie"]).toBeUndefined();
        },
      );
    });

    it("복귀 허용 목록은 메뉴 정의의 경로와 같고 준비 중인 항목 경로는 받지 않는다", async () => {
      const stateNext = (setCookie: string[] | undefined) => {
        const value = setCookie?.[0]?.match(/oauth-state=([^;]+)/)?.[1] ?? "";
        return (
          JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as {
            next?: string;
          }
        ).next;
      };
      await serve(jest.fn(), async (port) => {
        const start = (next: string) =>
          request(
            port,
            `/admin/ai-models/oauth/start?next=${encodeURIComponent(next)}`,
            { method: "POST", headers: { origin: "https://mcp.example.test" } },
          );
        for (const path of adminPagePaths) {
          expect(stateNext((await start(path)).headers["set-cookie"])).toBe(
            path,
          );
        }
        // 메뉴에만 있고 화면이 없는 "준비 중" 항목은 이동지가 될 수 없다
        expect(
          stateNext((await start("/admin/resume-tools")).headers["set-cookie"]),
        ).toBeUndefined();
      });
    });
  });
});
