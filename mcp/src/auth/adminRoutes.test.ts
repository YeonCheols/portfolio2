import http from "http";

import { handleAdminRequest } from "@mcp/auth/adminRoutes";
import { createPortfolioAdminApi } from "@mcp/auth/adminApi";

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
  const createServer = (fetchImpl: typeof fetch) =>
    http.createServer((req, res) => {
      void handleAdminRequest(req, res, {
        api: createPortfolioAdminApi({ baseUrl: apiUrl, fetchImpl }),
        publicUrl: "https://mcp.example.test/mcp",
      });
    });

  it("portfolio-api 로그인으로 host-only HttpOnly 세션을 설정하고 대시보드로 이동한다", async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      status: 201,
      headers: new Headers({
        "set-cookie": "access_token=api-jwt; Path=/; HttpOnly",
      }),
      json: async () => ({ user: { id: 1, email: "admin@example.com" } }),
    });
    const server = createServer(fetchImpl);
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    const port = (server.address() as { port: number }).port;
    try {
      const body = new URLSearchParams({
        email: "admin@example.com",
        password: "pw",
      }).toString();
      const response = await request(port, "/admin/ai-models/login", {
        method: "POST",
        body,
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          "content-length": String(Buffer.byteLength(body)),
          origin: "https://mcp.example.test",
        },
      });
      expect(response.status).toBe(303);
      expect(response.headers.location).toBe("/admin/ai-models");
      expect(response.headers["set-cookie"]?.[0]).toContain(
        "__Host-portfolio-admin-session=api-jwt",
      );
      expect(response.headers["set-cookie"]?.[0]).toContain("HttpOnly");
      expect(response.headers["set-cookie"]?.[0]).not.toContain("Domain=");
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
        `${apiUrl}/admin/resume-model-setting`,
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
