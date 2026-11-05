import http from "http";

import { handleAdminRequest } from "@mcp/interfaces/admin/http/admin-routes";

const session = "__Host-portfolio-admin-session=jwt";
const origin = "https://mcp.example.test";
const path = "/admin/tools/resume/api/call";

type Reply = { status: number; body: string };

const callApi = (
  options: {
    introspect?: jest.Mock;
    runTool?: jest.Mock | undefined;
    log?: jest.Mock;
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  } = {},
): Promise<Reply> =>
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
          jest.fn().mockResolvedValue({ active: true, sub: "7" }),
        toolCatalog: [],
        runTool: "runTool" in options ? options.runTool : jest.fn(),
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
          path,
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

const okResult = {
  isError: false,
  content: [{ type: "text", text: "결과 본문" }],
};

describe("관리자 도구 실행 API", () => {
  it("유효한 관리 세션이면 이름과 인자로 도구를 한 번 실행하고 결과를 돌려준다", async () => {
    const runTool = jest.fn().mockResolvedValue(okResult);

    const reply = await callApi({
      runTool,
      body: JSON.stringify({
        name: "validate_resume_xml",
        arguments: { source: "repository" },
      }),
    });

    expect(reply.status).toBe(200);
    expect(JSON.parse(reply.body)).toEqual({ ok: true, ...okResult });
    expect(runTool).toHaveBeenCalledTimes(1);
    expect(runTool).toHaveBeenCalledWith({
      name: "validate_resume_xml",
      arguments: { source: "repository" },
      subject: "7",
    });
  });

  it("도구가 실패해도 코드만 담아 돌려주고 PDF 본문은 크기만 알린다", async () => {
    const failed = await callApi({
      runTool: jest.fn().mockResolvedValue({
        isError: true,
        content: [{ type: "text", text: "UNKNOWN_TOOL" }],
      }),
      body: JSON.stringify({ name: "nope", arguments: {} }),
    });
    expect(failed.status).toBe(200);
    expect(JSON.parse(failed.body).isError).toBe(true);

    const blob = Buffer.from("pdf-bytes").toString("base64");
    const pdf = await callApi({
      runTool: jest.fn().mockResolvedValue({
        isError: false,
        content: [
          {
            type: "resource",
            resource: {
              uri: "file:///r.pdf",
              mimeType: "application/pdf",
              blob,
            },
          },
        ],
      }),
      body: JSON.stringify({ name: "convert_resume_to_pdf", arguments: {} }),
    });
    expect(pdf.body).not.toContain(blob);
    expect(JSON.parse(pdf.body).content[0]).toEqual({
      type: "resource",
      uri: "file:///r.pdf",
      mimeType: "application/pdf",
      byteLength: 9,
    });
  });

  it("쿠키 없음, 다른 출처, 무효 세션, 세션 확인 실패, 잘못된 메서드는 도구를 실행하지 않는다", async () => {
    const body = JSON.stringify({ name: "validate_resume_xml", arguments: {} });
    const cases: Array<[string, Parameters<typeof callApi>[0], number]> = [
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
      const runTool = jest.fn();
      const reply = await callApi({ ...options, runTool });
      expect([label, reply.status]).toEqual([label, status]);
      expect(runTool).not.toHaveBeenCalled();
    }
  });

  it("잘못된 본문은 400으로 거절하고 도구 연결이 없으면 503이다", async () => {
    for (const body of [
      "not json",
      "[]",
      JSON.stringify({ arguments: {} }),
      JSON.stringify({ name: "x", arguments: [] }),
      JSON.stringify({ name: "x", arguments: "text" }),
    ]) {
      const runTool = jest.fn();
      const reply = await callApi({ runTool, body });
      expect([body, reply.status]).toEqual([body, 400]);
      expect(runTool).not.toHaveBeenCalled();
    }

    const missing = await callApi({
      runTool: undefined,
      body: JSON.stringify({ name: "validate_resume_xml", arguments: {} }),
    });
    expect(missing.status).toBe(503);
  });

  it("로그에는 실행자와 도구 이름과 결과 코드만 남기고 인자와 결과 본문은 남기지 않는다", async () => {
    const log = jest.fn();

    await callApi({
      log,
      runTool: jest.fn().mockResolvedValue({
        isError: true,
        content: [{ type: "text", text: "MODEL_AUTH_FAILED" }],
      }),
      body: JSON.stringify({
        name: "generate_resume",
        arguments: { xml: "<secret-resume-xml/>" },
      }),
    });

    const lines = log.mock.calls.map(([line]) => String(line));
    const line = lines.find((entry) => entry.startsWith("ADMIN_TOOLS"));
    expect(line).toContain("action=call");
    expect(line).toContain("tool=generate_resume");
    expect(line).toContain("result=error");
    expect(lines.join("\n")).not.toContain("secret-resume-xml");
    expect(lines.join("\n")).not.toContain("jwt");
  });
});
