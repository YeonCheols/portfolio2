import http from "http";

import { createResumeMcpServer } from "./createResumeMcpServer";
import { connectedResume } from "./resumeFixture";

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
  new Promise<{ status: number; contentType: string; body: string }>(
    (resolve, reject) => {
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
              contentType: String(res.headers["content-type"] ?? ""),
              body: chunks.join(""),
            }),
          );
        },
      );
      req.on("error", reject);
      if (options.body) req.write(options.body);
      req.end();
    },
  );

describe("createResumeMcpServer", () => {
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

  it("호스트의 Streamable HTTP 초기화는 이벤트 스트림으로 서버 이름을 돌려준다", async () => {
    const server = createResumeMcpServer({
      token: "test-token",
      connection: { load: async () => connectedResume() },
    });
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("port missing");
    }

    try {
      const opened = await request(address.port, {
        method: "POST",
        path: "/mcp",
        headers: {
          authorization: "Bearer test-token",
          accept: "application/json, text/event-stream",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "initialize",
          params: {
            protocolVersion: "2024-11-05",
            capabilities: {},
            clientInfo: { name: "cursor", version: "1.0.0" },
          },
        }),
      });

      expect(opened.status).toBe(200);
      expect(opened.contentType).toContain("text/event-stream");
      expect(opened.body).toContain("portfolio-resume");

      const listening = await request(address.port, {
        method: "GET",
        path: "/mcp",
        headers: {
          authorization: "Bearer test-token",
          accept: "text/event-stream",
        },
      });
      expect(listening.status).toBe(405);

      const called = await request(address.port, {
        method: "POST",
        path: "/mcp",
        headers: {
          authorization: "Bearer test-token",
          accept: "application/json, text/event-stream",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 2,
          method: "tools/call",
          params: {
            name: "validate_resume_xml",
            arguments: { source: "embedded", xml: validResumeXml },
          },
        }),
      });
      expect(called.contentType).toContain("text/event-stream");
      expect(called.body).toContain("resume-test");
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    }
  });
});
