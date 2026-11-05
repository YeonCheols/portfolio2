import http from "http";

import { handleAdminRequest } from "@mcp/interfaces/admin/http/admin-routes";

const session = "__Host-portfolio-admin-session=jwt";
const origin = "https://mcp.example.test";
const base = "/admin/tools/resume/api/presets";

type Options = {
  introspect?: jest.Mock;
  toolPresets?: unknown;
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
        toolCatalog: [],
        toolPresets: options.toolPresets,
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
          path: options.path ?? base,
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

const preset = {
  id: "00000000-0000-4000-8000-000000000001",
  label: "기본",
  arguments: { source: "repository" },
  createdAt: "2026-11-05T00:00:00.000Z",
};

const serviceOf = () => ({
  list: jest.fn().mockResolvedValue([preset]),
  save: jest.fn().mockResolvedValue(preset),
  remove: jest.fn().mockResolvedValue(undefined),
});

const saveBody = JSON.stringify({
  toolName: "generate_resume",
  label: "기본",
  arguments: { source: "repository", xml: "<x/>" },
});
const deleteBody = JSON.stringify({
  toolName: "generate_resume",
  id: preset.id,
});
const get = (toolPresets: unknown, query = "?tool=generate_resume") =>
  callApi({
    toolPresets,
    method: "GET",
    path: `${base}${query}`,
    headers: { cookie: session },
  });

describe("관리자 도구 프리셋 API", () => {
  it("유효한 관리 세션이면 도구별 프리셋 목록을 돌려준다", async () => {
    const toolPresets = serviceOf();

    const reply = await get(toolPresets);

    expect(reply.status).toBe(200);
    expect(JSON.parse(reply.body)).toEqual({ ok: true, presets: [preset] });
    expect(toolPresets.list).toHaveBeenCalledWith("generate_resume");

    const missing = await get(toolPresets, "");
    expect(missing.status).toBe(400);
  });

  it("저장은 작성자 해시와 함께 서비스에 넘기고 삭제는 도구와 ID만 넘긴다", async () => {
    const toolPresets = serviceOf();
    const log = jest.fn();

    const saved = await callApi({ toolPresets, log, body: saveBody });
    expect(saved.status).toBe(200);
    expect(JSON.parse(saved.body)).toEqual({
      ok: true,
      preset,
    });
    const [input, by] = toolPresets.save.mock.calls[0];
    expect(input).toEqual({
      toolName: "generate_resume",
      label: "기본",
      arguments: { source: "repository", xml: "<x/>" },
    });
    expect(by).toMatch(/^[0-9a-f]{64}$/);
    expect(by).not.toContain("admin-7");

    const removed = await callApi({
      toolPresets,
      log,
      path: `${base}/delete`,
      body: deleteBody,
    });
    expect(removed.status).toBe(200);
    expect(toolPresets.remove).toHaveBeenCalledWith(
      "generate_resume",
      preset.id,
    );

    const lines = log.mock.calls.map(([l]) => String(l)).join("\n");
    expect(lines).toContain(
      "action=preset_save tool=generate_resume result=ok",
    );
    expect(lines).toContain(
      "action=preset_delete tool=generate_resume result=ok",
    );
    expect(lines).not.toContain("기본");
    expect(lines).not.toContain("<x/>");
  });

  it("쿠키 없음, 다른 출처, 무효 세션, 세션 확인 실패, 잘못된 메서드는 서비스를 부르지 않는다", async () => {
    const cases: Array<[string, Options, number]> = [
      ["쿠키 없음", { headers: { origin }, body: saveBody }, 401],
      [
        "다른 출처",
        {
          headers: { cookie: session, origin: "https://evil.example" },
          body: saveBody,
        },
        403,
      ],
      ["출처 없음", { headers: { cookie: session }, body: saveBody }, 403],
      [
        "무효 세션",
        {
          introspect: jest.fn().mockResolvedValue({ active: false }),
          body: saveBody,
        },
        401,
      ],
      [
        "세션 확인 실패",
        {
          introspect: jest.fn().mockRejectedValue(new Error("down")),
          body: saveBody,
        },
        503,
      ],
      [
        "목록 경로의 PUT",
        { method: "PUT", headers: { cookie: session, origin }, body: saveBody },
        405,
      ],
      [
        "삭제 경로의 GET",
        { method: "GET", path: `${base}/delete`, headers: { cookie: session } },
        405,
      ],
    ];
    for (const [label, options, status] of cases) {
      const toolPresets = serviceOf();
      const reply = await callApi({ ...options, toolPresets });
      expect([label, reply.status]).toEqual([label, status]);
      for (const fn of Object.values(toolPresets))
        expect([label, fn.mock.calls.length]).toEqual([label, 0]);
    }
  });

  it("잘못된 본문은 400이고 서비스 오류는 코드별 상태로 바꾸며 서비스가 없으면 503이다", async () => {
    for (const body of [
      "not json",
      "[]",
      JSON.stringify({ label: "a", arguments: {} }),
      JSON.stringify({ toolName: "generate_resume", arguments: {} }),
      JSON.stringify({ toolName: "generate_resume", label: "a" }),
      JSON.stringify({
        toolName: "generate_resume",
        label: "a",
        arguments: [],
      }),
    ]) {
      const toolPresets = serviceOf();
      const reply = await callApi({ toolPresets, body });
      expect([body, reply.status]).toEqual([body, 400]);
      expect(toolPresets.save).not.toHaveBeenCalled();
    }
    const badDelete = await callApi({
      toolPresets: serviceOf(),
      path: `${base}/delete`,
      body: JSON.stringify({ toolName: "generate_resume" }),
    });
    expect(badDelete.status).toBe(400);

    const statusOf: Record<string, number> = {
      UNKNOWN_TOOL: 404,
      PRESET_NOT_FOUND: 404,
      INVALID_PRESET: 400,
      PRESET_XML_NOT_ALLOWED: 400,
      PRESET_TOO_LARGE: 413,
      PRESET_LIMIT: 409,
      PRESET_STORAGE_FAILED: 502,
      PRESET_DELETE_FAILED: 502,
    };
    for (const [code, status] of Object.entries(statusOf)) {
      const toolPresets = serviceOf();
      toolPresets.save.mockRejectedValue(
        Object.assign(new Error("secret upstream"), { code }),
      );
      const reply = await callApi({ toolPresets, body: saveBody });
      expect([code, reply.status]).toEqual([code, status]);
      expect(JSON.parse(reply.body)).toEqual({ ok: false, code });
      expect(reply.body).not.toContain("secret");
    }
    const unknownError = serviceOf();
    unknownError.save.mockRejectedValue(new Error("boom"));
    expect(
      (await callApi({ toolPresets: unknownError, body: saveBody })).status,
    ).toBe(502);

    expect((await callApi({ body: saveBody })).status).toBe(503);
  });
});
