import http from "http";

import { handleAdminRequest } from "@mcp/interfaces/admin/http/admin-routes";

const session = "__Host-portfolio-admin-session=jwt";
const origin = "https://mcp.example.test";
const catalog = [
  { name: "validate_resume_xml", description: "검증", inputSchema: {} },
  { name: "generate_resume", description: "생성", inputSchema: {} },
];

type Options = {
  introspect?: jest.Mock;
  toolPolicy?: unknown;
  log?: jest.Mock;
  method?: string;
  path?: string;
  headers?: Record<string, string>;
  body?: string;
};

const callApi = (
  options: Options = {},
): Promise<{ status: number; body: string }> =>
  new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      handleAdminRequest(req, res, {
        api: { request: jest.fn() },
        oauth: { startAuthorization: jest.fn(), exchangeCode: jest.fn() },
        publicUrl: `${origin}/mcp`,
        oauthResource: `${origin}/mcp`,
        authorizationOrigin: "https://api.example.test",
        introspect:
          options.introspect ??
          jest.fn().mockResolvedValue({ active: true, sub: "admin-7" }),
        toolCatalog: catalog,
        toolPolicy: options.toolPolicy,
        log: options.log,
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
          method: options.method ?? "POST",
          path: options.path ?? "/admin/tools/resume/api/policy",
          headers: options.headers ?? {
            cookie: session,
            origin,
            "content-type": "application/json",
          },
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
      if (options.body !== undefined) req.write(options.body);
      req.end();
    });
  });

const policyOf = (disabled: string[] = []) => ({
  disabledNames: jest.fn().mockResolvedValue(new Set(disabled)),
  setEnabled: jest.fn().mockResolvedValue(undefined),
});

const list = (options: Options) =>
  callApi({
    method: "GET",
    path: "/admin/tools/resume/api/tools",
    headers: { cookie: session },
    ...options,
  });

describe("관리자 도구 활성 정책 API", () => {
  it("도구 목록에 도구별 활성 여부를 싣고 정책을 읽을 수 없으면 상태를 비워 둔다", async () => {
    const ok = JSON.parse(
      (await list({ toolPolicy: policyOf(["generate_resume"]) })).body,
    );
    expect(ok.policyAvailable).toBe(true);
    expect(
      ok.tools.map((t: { name: string; enabled: boolean }) => [
        t.name,
        t.enabled,
      ]),
    ).toEqual([
      ["validate_resume_xml", true],
      ["generate_resume", false],
    ]);

    const none = JSON.parse((await list({})).body);
    expect(none.policyAvailable).toBe(false);
    expect(
      none.tools.every((t: { enabled?: boolean }) => !("enabled" in t)),
    ).toBe(true);

    const broken = JSON.parse(
      (
        await list({
          toolPolicy: {
            disabledNames: jest.fn().mockRejectedValue(new Error("down")),
            setEnabled: jest.fn(),
          },
        })
      ).body,
    );
    expect(broken.policyAvailable).toBe(false);
    expect(broken.tools).toHaveLength(2);
  });

  it("유효한 관리 세션이면 도구를 켜고 끄며 저장자는 해시로만 남긴다", async () => {
    const toolPolicy = policyOf();
    const log = jest.fn();

    const reply = await callApi({
      toolPolicy,
      log,
      body: JSON.stringify({ name: "generate_resume", enabled: false }),
    });

    expect(reply.status).toBe(200);
    expect(JSON.parse(reply.body)).toEqual({
      ok: true,
      name: "generate_resume",
      enabled: false,
    });
    expect(toolPolicy.setEnabled).toHaveBeenCalledTimes(1);
    const [name, enabled, by] = toolPolicy.setEnabled.mock.calls[0];
    expect([name, enabled]).toEqual(["generate_resume", false]);
    expect(by).toMatch(/^[0-9a-f]{64}$/);
    expect(by).not.toContain("admin-7");

    const line = log.mock.calls
      .map(([l]) => String(l))
      .find((l) => l.startsWith("ADMIN_TOOLS"));
    expect(line).toContain("action=policy");
    expect(line).toContain("tool=generate_resume");
    expect(line).toContain("enabled=false");
    expect(line).toContain("result=ok");
    // 실행자는 기존 관리 로그와 같은 형식으로만 남기고 해시는 로그에 쓰지 않는다
    expect(line).toContain("sub=admin-7");
    expect(line).not.toContain(by);
  });

  it("쿠키 없음, 다른 출처, 무효 세션, 세션 확인 실패, 잘못된 메서드는 정책을 바꾸지 않는다", async () => {
    const body = JSON.stringify({ name: "generate_resume", enabled: false });
    const cases: Array<[string, Options, number]> = [
      ["쿠키 없음", { headers: { origin }, body }, 401],
      [
        "다른 출처",
        { headers: { cookie: session, origin: "https://evil.example" }, body },
        403,
      ],
      ["출처 없음", { headers: { cookie: session }, body }, 403],
      [
        "무효 세션",
        { introspect: jest.fn().mockResolvedValue({ active: false }), body },
        401,
      ],
      [
        "세션 확인 실패",
        { introspect: jest.fn().mockRejectedValue(new Error("down")), body },
        503,
      ],
      [
        "잘못된 메서드",
        { method: "GET", headers: { cookie: session, origin } },
        405,
      ],
    ];
    for (const [label, options, status] of cases) {
      const toolPolicy = policyOf();
      const reply = await callApi({ ...options, toolPolicy });
      expect([label, reply.status]).toEqual([label, status]);
      expect(toolPolicy.setEnabled).not.toHaveBeenCalled();
    }
  });

  it("잘못된 본문과 알 수 없는 도구와 정책 미연결은 저장 없이 거절한다", async () => {
    for (const body of [
      "not json",
      "[]",
      JSON.stringify({ enabled: true }),
      JSON.stringify({ name: "generate_resume" }),
      JSON.stringify({ name: "generate_resume", enabled: "false" }),
    ]) {
      const toolPolicy = policyOf();
      const reply = await callApi({ toolPolicy, body });
      expect([body, reply.status]).toEqual([body, 400]);
      expect(toolPolicy.setEnabled).not.toHaveBeenCalled();
    }

    const unknown = policyOf();
    unknown.setEnabled.mockRejectedValue(
      Object.assign(new Error("x"), { code: "UNKNOWN_TOOL" }),
    );
    const notFound = await callApi({
      toolPolicy: unknown,
      body: JSON.stringify({ name: "nope", enabled: false }),
    });
    expect(notFound.status).toBe(404);

    const unavailable = policyOf();
    unavailable.setEnabled.mockRejectedValue(
      Object.assign(new Error("x"), { code: "TOOL_POLICY_UNAVAILABLE" }),
    );
    const down = await callApi({
      toolPolicy: unavailable,
      body: JSON.stringify({ name: "generate_resume", enabled: false }),
    });
    expect(down.status).toBe(503);
    expect(down.body).not.toContain("x");

    const none = await callApi({
      body: JSON.stringify({ name: "generate_resume", enabled: false }),
    });
    expect(none.status).toBe(503);
  });
});
