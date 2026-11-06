/** @jest-environment node */

import http from "http";

import { createResumeMcpServer } from "@mcp/bootstrap/create-resume-mcp-server";
import { handleMcpRequest } from "@mcp/interfaces/tools/handle-mcp-request";
import { resumeToolSamples } from "@mcp/interfaces/tools/resume/resume-tool-samples";
import { connectedResume } from "@mcp/modules/resume/testing/resume-fixture";
import { createFakeArchiveStorage } from "@mcp/modules/resume/testing/fake-archive-storage";
import { createResumeToolPresets } from "@mcp/modules/resume/tool-presets/resume-tool-presets";

const validResumeXml = `<?xml version="1.0" encoding="UTF-8"?>
<resumeAsset id="resume-test" schemaVersion="0.2.0" xml:lang="ko-KR" status="draft" publicationStatus="internal-only" visibility="private" xmlns:xml="http://www.w3.org/XML/1998/namespace">
  <metadata><sourceDocument id="source-page-1" visibility="private-source" /></metadata>
  <profile id="profile-test" sourceRefs="source-page-1" visibility="private">
    <name visibility="public">테스트 사용자</name>
  </profile>
</resumeAsset>`;

const request = (
  port: number,
  options: {
    method: string;
    path: string;
    headers?: Record<string, string>;
    body?: string;
  },
) =>
  new Promise<{ status: number; body: string }>((resolve, reject) => {
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port,
        method: options.method,
        path: options.path,
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
          }),
        );
      },
    );
    req.on("error", reject);
    if (options.body) req.write(options.body);
    req.end();
  });

describe("createResumeMcpServer", () => {
  it("관리자 검토 판정을 도구 호출 맥락에 전달해 같은 생성의 PDF 변환을 허용한다", async () => {
    const generate = jest.fn(async () =>
      JSON.stringify({
        claims: [
          {
            text: "테스트 사용자입니다",
            sourceIds: ["profile-test"],
            evidence: [{ sourceId: "profile-test", quote: "테스트 사용자" }],
          },
        ],
      }),
    );
    const qualityReviews = {
      load: jest.fn(
        async ({
          evaluation,
        }: {
          evaluation: {
            evaluationId: string;
            caseSetVersion: string;
            policyVersion: string;
            inputRef: string;
            outputRef: string;
            cases: { caseId: string; decision: string; blocking: boolean }[];
          };
        }) =>
          evaluation.cases
            .filter(
              ({ decision, blocking }) =>
                decision === "needs_review" && blocking,
            )
            .map(({ caseId }) => ({
              evaluationId: evaluation.evaluationId,
              caseSetVersion: evaluation.caseSetVersion,
              policyVersion: evaluation.policyVersion,
              inputRef: evaluation.inputRef,
              outputRef: evaluation.outputRef,
              caseId,
              decision: "pass" as const,
              reviewedAt: "2026-11-06T01:00:00.000Z",
              reviewerHash: "a".repeat(64),
            })),
      ),
    };
    const server = createResumeMcpServer({
      introspect: async () => ({ active: true, sub: "user-a" }),
      environment: "production",
      connection: { load: async () => connectedResume() },
      model: { generate },
      qualityReviews,
    });
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    const address = server.address();
    if (!address || typeof address === "string")
      throw new Error("port missing");
    const call = async (name: string, args: Record<string, unknown>) =>
      request(address.port, {
        method: "POST",
        path: "/mcp",
        headers: { authorization: "Bearer user-a" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "tools/call",
          params: { name, arguments: args },
        }),
      });
    try {
      const created = JSON.parse(
        (
          await call("generate_resume", {
            source: "embedded",
            xml: validResumeXml,
            template: "기본형",
            elementIds: ["profile-test"],
            sectionOrder: ["profile"],
          })
        ).body,
      );
      const { generationId } = JSON.parse(created.result.content[0].text);
      const converted = JSON.parse(
        (await call("convert_resume_to_pdf", { generationId })).body,
      );

      expect(converted.result.isError).toBe(false);
      expect(converted.result.content[0].text).toContain("PDF를 생성했습니다");
      expect(qualityReviews.load).toHaveBeenCalledWith(
        expect.objectContaining({ generationId }),
      );
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it("인증된 생성 결과를 다른 요청에서 재사용하면 모델을 다시 호출하지 않고 다른 사용자는 거부한다", async () => {
    const generate = jest.fn(async () =>
      JSON.stringify({
        claims: [
          {
            text: "테스트 사용자입니다",
            sourceIds: ["profile-test"],
            evidence: [{ sourceId: "profile-test", quote: "테스트 사용자" }],
          },
        ],
      }),
    );
    const createModel = jest.fn(() => ({ generate }));
    const storage = {
      putJson: jest.fn(async (_path: string, _value: unknown) => {}),
    };
    const server = createResumeMcpServer({
      introspect: async (token) => ({
        active: token !== "inactive",
        sub: token,
      }),
      environment: "production",
      connection: { load: async () => connectedResume() },
      model: createModel,
      storage,
    });
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    const address = server.address();
    if (!address || typeof address === "string")
      throw new Error("port missing");
    const call = async (token: string, args: Record<string, unknown>) =>
      request(address.port, {
        method: "POST",
        path: "/mcp",
        headers: { authorization: `Bearer ${token}` },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "tools/call",
          params: { name: "generate_resume", arguments: args },
        }),
      });
    try {
      const created = JSON.parse(
        (
          await call("user-a", {
            source: "embedded",
            xml: validResumeXml,
            template: "기본형",
            elementIds: ["profile-test"],
            sectionOrder: ["profile"],
          })
        ).body,
      );
      expect(created.result.isError).toBe(false);
      const { generationId } = JSON.parse(created.result.content[0].text);
      expect(generationId).toEqual(expect.any(String));
      const resumed = JSON.parse((await call("user-a", { generationId })).body);
      expect(resumed.result.isError).toBe(false);
      const denied = JSON.parse((await call("user-b", { generationId })).body);
      expect(denied.result.isError).toBe(true);
      expect(denied.result.content[0].text).toContain("GENERATION_NOT_FOUND");
      expect((await call("inactive", { generationId })).status).toBe(401);
      expect(generate).toHaveBeenCalledTimes(1);
      expect(createModel).toHaveBeenCalledTimes(1);
      expect(storage.putJson).toHaveBeenCalledWith(
        expect.stringMatching(/^debug\/resume\/production\//),
        expect.objectContaining({
          response: expect.any(String),
          stage: "completed",
        }),
      );
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
  it("이력서 생성은 서버에 연결된 외부 AI를 호출한다", async () => {
    const requests: { persona: string; prompt: string }[] = [];
    const server = createResumeMcpServer({
      introspect: async (token) => ({
        active: token === "test-token",
        sub: "test-user",
      }),
      environment: "production",
      connection: { load: async () => connectedResume() },
      model: {
        generate: async (input) => {
          requests.push(input);
          return JSON.stringify({
            claims: [
              {
                text: "테스트 사용자입니다",
                sourceIds: ["profile-test"],
                evidence: [
                  { sourceId: "profile-test", quote: "테스트 사용자" },
                ],
              },
            ],
          });
        },
      },
    });
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("port missing");
    }

    try {
      const response = await request(address.port, {
        method: "POST",
        path: "/mcp",
        headers: {
          authorization: "Bearer test-token",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 2,
          method: "tools/call",
          params: {
            name: "generate_resume",
            arguments: {
              source: "embedded",
              xml: validResumeXml,
              template: "기본형",
              elementIds: ["profile-test"],
              sectionOrder: ["profile"],
            },
          },
        }),
      });

      expect(response.status).toBe(200);
      expect(requests).toHaveLength(1);
      expect(response.body).toContain("테스트 사용자입니다");
      expect(response.body).not.toContain("gemini");
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    }
  });

  it("모델 팩토리는 새 생성 요청에만 클라이언트를 만들고 모델을 한 번 호출한다", async () => {
    const clients: { calls: string[] }[] = [];
    const createModel = jest.fn(() => {
      const client = { calls: [] as string[] };
      clients.push(client);

      return {
        generate: async (input: { persona: string; prompt: string }) => {
          client.calls.push(input.persona);
          return JSON.stringify({
            claims: [
              {
                text: "테스트 사용자입니다",
                sourceIds: ["profile-test"],
                evidence: [
                  { sourceId: "profile-test", quote: "테스트 사용자" },
                ],
              },
            ],
          });
        },
      };
    });
    const server = createResumeMcpServer({
      introspect: async (token) => ({
        active: token === "test-token",
        sub: "test-user",
      }),
      environment: "production",
      connection: { load: async () => connectedResume() },
      model: createModel,
    });
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("port missing");
    }
    const generate = () =>
      request(address.port, {
        method: "POST",
        path: "/mcp",
        headers: {
          authorization: "Bearer test-token",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 2,
          method: "tools/call",
          params: {
            name: "generate_resume",
            arguments: {
              source: "embedded",
              xml: validResumeXml,
              template: "기본형",
              elementIds: ["profile-test"],
              sectionOrder: ["profile"],
            },
          },
        }),
      });

    try {
      const first = await generate();
      const second = await generate();

      expect(first.status).toBe(200);
      expect(second.status).toBe(200);
      expect(first.body).toContain("테스트 사용자입니다");
      expect(createModel).toHaveBeenCalledTimes(2);
      expect(clients).toHaveLength(2);
      expect(clients[0].calls).toHaveLength(1);
      expect(clients[1].calls).toHaveLength(1);
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    }
  });

  it("헬스 확인은 열고 인증 없는 도구 호출은 본문 없이 거부한다", async () => {
    const log = jest.fn();
    const server = createResumeMcpServer({
      introspect: async (token) => ({
        active: token === "test-token",
        sub: "test-user",
      }),
      environment: "production",
      protectedResourceMetadata: {
        resource: "https://mcp.example.test/mcp",
        authorization_servers: ["https://api.example.test/auth"],
      },
      connection: { load: async () => connectedResume() },
      log,
    });
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("port missing");
    }

    try {
      const health = await request(address.port, {
        method: "GET",
        path: "/health",
      });
      expect(health.status).toBe(200);

      const metadata = await request(address.port, {
        method: "GET",
        path: "/.well-known/oauth-protected-resource/mcp",
      });
      expect(metadata.status).toBe(200);
      expect(JSON.parse(metadata.body)).toMatchObject({
        resource: "https://mcp.example.test/mcp",
        authorization_servers: ["https://api.example.test/auth"],
      });

      const denied = await request(address.port, {
        method: "POST",
        path: "/mcp",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "tools/call",
          params: {
            name: "validate_resume_xml",
            arguments: {
              source: "embedded",
              xml: "<resumeAsset>hidden@example.com",
            },
          },
        }),
      });
      expect(denied.status).toBe(401);
      expect(denied.body).not.toContain("hidden@example.com");

      const allowed = await request(address.port, {
        method: "POST",
        path: "/mcp",
        headers: {
          authorization: "Bearer test-token",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "tools/call",
          params: {
            name: "validate_resume_xml",
            arguments: { source: "embedded", xml: validResumeXml },
          },
        }),
      });
      expect(allowed.status).toBe(200);
      expect(JSON.parse(allowed.body)).toMatchObject({
        result: { content: [{ text: "resume-test" }] },
      });
      expect(log.mock.calls.join(" ")).not.toContain("hidden@example.com");
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    }
  });

  it("요청 본문이 1 MiB를 넘으면 introspection 전에 거부한다", async () => {
    const introspect = jest.fn(async () => true);
    const server = createResumeMcpServer({
      introspect,
      connection: { load: async () => connectedResume() },
    });
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    const address = server.address();
    if (!address || typeof address === "string")
      throw new Error("port missing");

    try {
      const response = await request(address.port, {
        method: "POST",
        path: "/mcp",
        headers: { "content-type": "application/json" },
        body: "x".repeat(1024 * 1024 + 1),
      });
      expect(response.status).toBe(413);
      expect(introspect).not.toHaveBeenCalled();
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    }
  });

  it("portfolio-api introspection 실패 시 요청을 fail-closed 처리한다", async () => {
    const server = createResumeMcpServer({
      introspect: async () => {
        throw new Error("AUTH_INTROSPECTION_FAILED");
      },
      connection: { load: async () => connectedResume() },
    });
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    const address = server.address();
    if (!address || typeof address === "string")
      throw new Error("port missing");

    try {
      const response = await request(address.port, {
        method: "POST",
        path: "/mcp",
        headers: {
          authorization: "Bearer user-access-token",
          "content-type": "application/json",
        },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
      });
      expect(response.status).toBe(503);
      expect(response.body).toContain("AUTH_UNAVAILABLE");
      expect(response.body).not.toContain("user-access-token");
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    }
  });

  it("관리자 도구 목록은 /mcp tools/list와 같은 정의를 쓴다", async () => {
    const connection = { load: jest.fn() };
    const server = createResumeMcpServer({
      introspect: jest.fn().mockResolvedValue(true),
      connection,
      admin: {
        introspect: jest.fn().mockResolvedValue({ active: true, sub: "7" }),
        publicUrl: "https://mcp.example.test/mcp",
      },
    } as never);
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", () => resolve()),
    );
    const port = (server.address() as { port: number }).port;
    try {
      const listed = await handleMcpRequest(
        { jsonrpc: "2.0", id: 1, method: "tools/list" },
        connection,
      );
      const admin = await request(port, {
        method: "GET",
        path: "/admin/tools/resume/api/tools",
        headers: { cookie: "__Host-portfolio-admin-session=jwt" },
      });

      expect(admin.status).toBe(200);
      const adminTools = JSON.parse(admin.body).tools as Array<
        Record<string, unknown>
      >;
      const mcpTools = (listed as { result: { tools: unknown[] } }).result
        .tools;
      // /mcp 계약에는 샘플이 없고 관리자 목록에만 도구마다 샘플 인자가 붙는다
      expect(adminTools.map(({ sampleArguments: _, ...rest }) => rest)).toEqual(
        mcpTools,
      );
      expect(JSON.stringify(mcpTools)).not.toContain("sampleArguments");
      for (const tool of adminTools)
        expect(tool.sampleArguments).toEqual(
          resumeToolSamples[tool.name as string],
        );
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    }
  });

  it("관리자 도구 실행은 /mcp와 같은 호출 경로를 쓰고 새 생성만 모델을 한 번 호출한다", async () => {
    const generate = jest.fn(async () =>
      JSON.stringify({
        claims: [
          {
            text: "테스트 사용자입니다",
            sourceIds: ["profile-test"],
            evidence: [{ sourceId: "profile-test", quote: "테스트 사용자" }],
          },
        ],
      }),
    );
    const server = createResumeMcpServer({
      introspect: jest.fn().mockResolvedValue({ active: true, sub: "7" }),
      environment: "development",
      connection: { load: async () => connectedResume() },
      model: () => ({ generate }),
      admin: {
        introspect: jest.fn().mockResolvedValue({ active: true, sub: "7" }),
        publicUrl: "https://mcp.example.test/mcp",
      },
    } as never);
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", () => resolve()),
    );
    const port = (server.address() as { port: number }).port;
    const adminCall = (name: string, args: Record<string, unknown>) =>
      request(port, {
        method: "POST",
        path: "/admin/tools/resume/api/call",
        headers: {
          cookie: "__Host-portfolio-admin-session=jwt",
          origin: "https://mcp.example.test",
          "content-type": "application/json",
        },
        body: JSON.stringify({ name, arguments: args }),
      });
    try {
      const validated = await adminCall("validate_resume_xml", {
        source: "embedded",
        xml: validResumeXml,
      });
      const viaMcp = await request(port, {
        method: "POST",
        path: "/mcp",
        headers: {
          authorization: "Bearer token",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "tools/call",
          params: {
            name: "validate_resume_xml",
            arguments: { source: "embedded", xml: validResumeXml },
          },
        }),
      });
      expect(JSON.parse(validated.body).content).toEqual(
        JSON.parse(viaMcp.body).result.content,
      );
      expect(generate).not.toHaveBeenCalled();

      const unknown = await adminCall("nope", {});
      expect(JSON.parse(unknown.body)).toMatchObject({
        isError: true,
        content: [{ type: "text", text: "UNKNOWN_TOOL" }],
      });

      const generated = await adminCall("generate_resume", {
        source: "embedded",
        xml: validResumeXml,
        elementIds: ["profile-test"],
        sectionOrder: ["profile"],
        template: "기본형",
      });
      expect(generated.status).toBe(200);
      expect(generate).toHaveBeenCalledTimes(1);
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    }
  });

  it("같은 정책으로 /mcp에서는 끈 도구를 숨기고 거절하고 관리 화면에서는 끈 도구도 시험할 수 있다", async () => {
    const disabled = new Set<string>();
    const toolPolicy = {
      disabledNames: async () => new Set(disabled),
      setEnabled: async (name: string, enabled: boolean) => {
        if (enabled) disabled.delete(name);
        else disabled.add(name);
      },
    };
    const server = createResumeMcpServer({
      introspect: jest.fn().mockResolvedValue({ active: true, sub: "7" }),
      environment: "development",
      connection: { load: async () => connectedResume() },
      toolPolicy,
      admin: {
        introspect: jest.fn().mockResolvedValue({ active: true, sub: "7" }),
        publicUrl: "https://mcp.example.test/mcp",
      },
    } as never);
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", () => resolve()),
    );
    const port = (server.address() as { port: number }).port;
    const mcp = (method: string, params?: unknown) =>
      request(port, {
        method: "POST",
        path: "/mcp",
        headers: {
          authorization: "Bearer token",
          "content-type": "application/json",
        },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      }).then((reply) => JSON.parse(reply.body));
    const admin = (path: string, body?: unknown) =>
      request(port, {
        method: body === undefined ? "GET" : "POST",
        path: `/admin/tools/resume/api/${path}`,
        headers: {
          cookie: "__Host-portfolio-admin-session=jwt",
          origin: "https://mcp.example.test",
          "content-type": "application/json",
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      }).then((reply) => JSON.parse(reply.body));
    const names = (reply: { result: { tools: Array<{ name: string }> } }) =>
      reply.result.tools.map((tool) => tool.name);
    try {
      expect(names(await mcp("tools/list"))).toContain("validate_resume_xml");

      const toggled = await admin("policy", {
        name: "validate_resume_xml",
        enabled: false,
      });
      expect(toggled).toEqual({
        ok: true,
        name: "validate_resume_xml",
        enabled: false,
      });

      expect(names(await mcp("tools/list"))).not.toContain(
        "validate_resume_xml",
      );
      const blocked = await mcp("tools/call", {
        name: "validate_resume_xml",
        arguments: { source: "embedded", xml: validResumeXml },
      });
      expect(blocked.result).toMatchObject({
        isError: true,
        content: [{ type: "text", text: "TOOL_DISABLED" }],
      });

      const listed = await admin("tools");
      expect(listed.environment).toBe("development");
      const entry = listed.tools.find(
        (tool: { name: string }) => tool.name === "validate_resume_xml",
      );
      expect(entry.enabled).toBe(false);
      const tried = await admin("call", {
        name: "validate_resume_xml",
        arguments: { source: "embedded", xml: validResumeXml },
      });
      expect(tried.isError).toBe(false);
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    }
  });

  it("관리 화면에서 저장한 프리셋은 입력 인자 그대로 보관되고 샘플과 다른 XML은 거절한다", async () => {
    const storage = createFakeArchiveStorage();
    const sample = resumeToolSamples.generate_resume;
    const server = createResumeMcpServer({
      introspect: jest.fn().mockResolvedValue(true),
      environment: "development",
      connection: { load: async () => connectedResume() },
      toolPresets: createResumeToolPresets({
        storage,
        environment: "development",
        knownTools: ["generate_resume"],
        sampleXml: (name) =>
          String(resumeToolSamples[name]?.xml ?? "") || undefined,
      }),
      admin: {
        introspect: jest.fn().mockResolvedValue({ active: true, sub: "7" }),
        publicUrl: "https://mcp.example.test/mcp",
      },
    } as never);
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", () => resolve()),
    );
    const port = (server.address() as { port: number }).port;
    const admin = (path: string, body?: unknown) =>
      request(port, {
        method: body === undefined ? "GET" : "POST",
        path: `/admin/tools/resume/api/${path}`,
        headers: {
          cookie: "__Host-portfolio-admin-session=jwt",
          origin: "https://mcp.example.test",
          "content-type": "application/json",
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      }).then((reply) => ({
        status: reply.status,
        body: JSON.parse(reply.body),
      }));
    try {
      const saved = await admin("presets", {
        toolName: "generate_resume",
        label: "기본 시험",
        arguments: sample,
      });
      expect(saved.status).toBe(200);
      expect(saved.body.preset.arguments).toEqual(sample);

      // 저장한 것과 불러오는 것이 같다
      const listed = await admin("presets?tool=generate_resume");
      expect(listed.body.presets).toHaveLength(1);
      expect(listed.body.presets[0].arguments).toEqual(sample);

      const rejected = await admin("presets", {
        toolName: "generate_resume",
        label: "실제 XML",
        arguments: { ...sample, xml: validResumeXml },
      });
      expect(rejected.status).toBe(400);
      expect(rejected.body).toEqual({
        ok: false,
        code: "PRESET_XML_NOT_ALLOWED",
      });
      expect(
        (await admin("presets?tool=generate_resume")).body.presets,
      ).toHaveLength(1);

      await admin("presets/delete", {
        toolName: "generate_resume",
        id: saved.body.preset.id,
      });
      expect(
        (await admin("presets?tool=generate_resume")).body.presets,
      ).toEqual([]);
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    }
  });
});
