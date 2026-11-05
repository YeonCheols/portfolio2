/** @jest-environment node */

import http from "http";

import { createResumeMcpServer } from "@mcp/bootstrap/create-resume-mcp-server";
import { connectedResume } from "@mcp/modules/resume/testing/resume-fixture";

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
});
