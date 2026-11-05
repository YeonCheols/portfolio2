import http from "http";

import { handleAdminRequest } from "@mcp/interfaces/admin/http/admin-routes";

const catalog = [
  {
    name: "validate_resume_xml",
    description: "XML을 공통 이력서 모델로 검증한다",
    inputSchema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "generate_resume",
    description: "모델을 호출해 이력서를 작성한다",
    inputSchema: { type: "object", properties: {}, required: ["source"] },
  },
];

const session = "__Host-portfolio-admin-session=jwt";
const base = "/admin/tools/resume/api/tools";

describe("관리자 도구 목록 API", () => {
  const request = (
    introspect: jest.Mock,
    options: {
      method?: string;
      path?: string;
      headers?: Record<string, string>;
      toolCatalog?: unknown;
      environment?: string;
    } = {},
  ): Promise<{ status: number; body: string }> =>
    new Promise((resolve, reject) => {
      const server = http.createServer((req, res) => {
        handleAdminRequest(req, res, {
          api: { request: jest.fn() },
          oauth: { startAuthorization: jest.fn(), exchangeCode: jest.fn() },
          publicUrl: "https://mcp.example.test/mcp",
          oauthResource: "https://mcp.example.test/mcp",
          authorizationOrigin: "https://api.example.test",
          introspect,
          toolCatalog: "toolCatalog" in options ? options.toolCatalog : catalog,
          environment: options.environment,
        } as never)
          .then((handled) => {
            if (!handled) {
              res.writeHead(404);
              res.end();
            }
          })
          .catch(() => res.destroy());
      });
      server.listen(0, "127.0.0.1", () => {
        const port = (server.address() as { port: number }).port;
        const req = http.request(
          {
            hostname: "127.0.0.1",
            port,
            method: options.method ?? "GET",
            path: options.path ?? base,
            headers: options.headers ?? {},
          },
          (res) => {
            const chunks: string[] = [];
            res.setEncoding("utf8");
            res.on("data", (c: string) => chunks.push(c));
            res.on("end", () => {
              server.close();
              resolve({ status: res.statusCode ?? 0, body: chunks.join("") });
            });
          },
        );
        req.on("error", reject);
        req.end();
      });
    });

  it("유효한 관리 세션이면 도구 소유자가 준 이름·설명·스키마를 그대로 돌려준다", async () => {
    const introspect = jest.fn().mockResolvedValue({ active: true, sub: "7" });

    const result = await request(introspect, { headers: { cookie: session } });

    expect(result.status).toBe(200);
    // 정책이 연결되지 않은 서버는 활성 여부를 알 수 없다고 알린다
    expect(JSON.parse(result.body)).toEqual({
      ok: true,
      policyAvailable: false,
      tools: catalog,
    });
    expect(introspect).toHaveBeenCalledWith("jwt");
  });

  it("쿠키가 없거나 세션이 무효면 목록을 주지 않는다", async () => {
    const none = jest.fn();
    const anonymous = await request(none);
    expect(anonymous.status).toBe(401);
    expect(none).not.toHaveBeenCalled();

    const inactive = jest.fn().mockResolvedValue({ active: false });
    const rejected = await request(inactive, { headers: { cookie: session } });
    expect(rejected.status).toBe(401);
    expect(rejected.body).not.toContain("validate_resume_xml");
  });

  it("세션 확인이 실패하면 503이고 목록을 주지 않는다", async () => {
    const introspect = jest.fn().mockRejectedValue(new Error("down"));

    const result = await request(introspect, { headers: { cookie: session } });

    expect(result.status).toBe(503);
    expect(result.body).not.toContain("validate_resume_xml");
  });

  it("GET이 아닌 메서드는 세션을 확인하기 전에 거절한다", async () => {
    const introspect = jest.fn().mockResolvedValue({ active: true });

    const result = await request(introspect, {
      method: "POST",
      headers: {
        cookie: session,
        origin: "https://mcp.example.test",
      },
    });

    expect(result.status).toBe(405);
    expect(introspect).not.toHaveBeenCalled();
  });

  it("도구 목록이 연결되지 않은 서버는 503을 돌려준다", async () => {
    const introspect = jest.fn().mockResolvedValue({ active: true });

    const result = await request(introspect, {
      headers: { cookie: session },
      toolCatalog: undefined,
    });

    expect(result.status).toBe(503);
  });

  it("목록 응답에 서버의 환경을 싣고 알 수 없으면 싣지 않는다", async () => {
    const introspect = jest.fn().mockResolvedValue({ active: true, sub: "7" });
    const headers = { cookie: session };

    for (const environment of ["development", "production"]) {
      const reply = await request(introspect, { headers, environment });
      expect(JSON.parse(reply.body).environment).toBe(environment);
    }
    const unknown = await request(introspect, { headers });
    expect("environment" in JSON.parse(unknown.body)).toBe(false);
    const odd = await request(introspect, { headers, environment: "staging" });
    expect("environment" in JSON.parse(odd.body)).toBe(false);
  });
});
