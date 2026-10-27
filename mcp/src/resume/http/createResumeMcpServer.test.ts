import http from "http";

import { createResumeMcpServer } from "@mcp/resume/http/createResumeMcpServer";
import { resumeClaimVerifierPersona } from "@mcp/resume/output/runResumeHarness";
import { connectedResume } from "@mcp/resume/testing/resumeFixture";

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
  it("이력서 생성은 서버에 연결된 외부 AI를 호출한다", async () => {
    const requests: { persona: string; prompt: string }[] = [];
    const server = createResumeMcpServer({
      token: "test-token",
      connection: { load: async () => connectedResume() },
      model: {
        generate: async (input) => {
          requests.push(input);
          if (input.persona === resumeClaimVerifierPersona) {
            return JSON.stringify({
              reviews: [
                {
                  claimIndex: 0,
                  status: "supported",
                  evidence: [
                    { sourceId: "profile-test", quote: "테스트 사용자" },
                  ],
                  reason: "이름이 원문에 있습니다",
                },
              ],
            });
          }
          return JSON.stringify({
            claims: [
              { text: "테스트 사용자입니다", sourceIds: ["profile-test"] },
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
      expect(requests).toHaveLength(2);
      expect(response.body).toContain("테스트 사용자입니다");
      expect(response.body).not.toContain("gemini");
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    }
  });

  it("헬스 확인은 열고 인증 없는 도구 호출은 본문 없이 거부한다", async () => {
    const log = jest.fn();
    const server = createResumeMcpServer({
      token: "test-token",
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
});
