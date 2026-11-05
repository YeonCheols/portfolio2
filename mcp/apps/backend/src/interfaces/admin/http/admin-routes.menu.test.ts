import { mkdtempSync, rmSync, writeFileSync } from "fs";
import http from "http";
import { tmpdir } from "os";
import { join } from "path";

import { handleAdminRequest } from "@mcp/interfaces/admin/http/admin-routes";

// 메뉴 정의에 한 줄만 추가해도 서버 라우트가 따라오는지 확인하려고 정의를 가짜 항목이 있는 것으로 바꾼다
jest.mock("@portfolio-mcp/admin-contracts", () => {
  const items = [
    {
      id: "example",
      label: "예시",
      description: "예시 화면",
      path: "/admin/example/page",
    },
    { id: "planned", label: "준비 중", description: "아직 없음" },
  ];
  return {
    adminMenuPath: "/admin",
    adminMenu: [{ id: "demo", label: "데모", items }],
    adminMenuItems: items,
    adminPagePaths: ["/admin", "/admin/example/page"],
  };
});

const indexHtml =
  '<!doctype html><html><body><div id="root"></div></body></html>';

describe("메뉴 정의에서 일괄 등록하는 화면 라우트", () => {
  let appRoot = "";
  beforeAll(() => {
    appRoot = mkdtempSync(join(tmpdir(), "admin-menu-app-"));
    writeFileSync(join(appRoot, "index.html"), indexHtml);
  });
  afterAll(() => rmSync(appRoot, { recursive: true, force: true }));

  const get = (
    introspect: jest.Mock,
    path: string,
    cookie?: string,
  ): Promise<{ status: number; location?: string; body: string }> =>
    new Promise((resolve, reject) => {
      const server = http.createServer((req, res) => {
        handleAdminRequest(req, res, {
          api: { request: jest.fn() },
          oauth: { startAuthorization: jest.fn(), exchangeCode: jest.fn() },
          publicUrl: "https://mcp.example.test/mcp",
          oauthResource: "https://mcp.example.test/mcp",
          authorizationOrigin: "https://api.example.test",
          introspect,
          appRoot,
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
        http
          .get(
            {
              hostname: "127.0.0.1",
              port,
              path,
              headers: cookie ? { cookie } : {},
            },
            (res) => {
              const chunks: string[] = [];
              res.setEncoding("utf8");
              res.on("data", (c: string) => chunks.push(c));
              res.on("end", () => {
                server.close();
                resolve({
                  status: res.statusCode ?? 0,
                  location: res.headers.location,
                  body: chunks.join(""),
                });
              });
            },
          )
          .on("error", reject);
      });
    });

  it("정의에만 추가한 화면 경로도 세션을 확인해 앱을 서빙하고 가려던 경로를 next로 싣는다", async () => {
    const introspect = jest.fn().mockResolvedValue({ active: true, sub: "7" });
    const session = "__Host-portfolio-admin-session=jwt";

    const anonymous = await get(introspect, "/admin/example/page?tab=1");
    expect(anonymous.status).toBe(303);
    expect(anonymous.location).toBe(
      `/admin/ai-models/connect?next=${encodeURIComponent("/admin/example/page?tab=1")}`,
    );

    const ok = await get(introspect, "/admin/example/page?tab=1", session);
    expect(ok.status).toBe(200);
    expect(ok.body).toBe(indexHtml);
    expect(introspect).toHaveBeenCalledWith("jwt");

    const menu = await get(introspect, "/admin/", session);
    expect(menu.status).toBe(200);
  });

  it("준비 중인 항목과 정의에 없는 경로는 화면으로 서빙하지 않는다", async () => {
    const introspect = jest.fn().mockResolvedValue({ active: true });
    const session = "__Host-portfolio-admin-session=jwt";

    for (const path of ["/admin/planned", "/admin/example", "/admin/other"]) {
      expect((await get(introspect, path, session)).status).toBe(404);
    }
    expect(introspect).not.toHaveBeenCalled();
  });
});
