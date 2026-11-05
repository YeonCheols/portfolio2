import assert from "node:assert/strict";
import { once } from "node:events";
import { createRequire } from "node:module";
import { test } from "node:test";

const require = createRequire(import.meta.url);
const {
  createResumeMcpServer,
} = require("./apps/backend/dist/bootstrap/create-resume-mcp-server.js");
const {
  createResumePdf,
} = require("./apps/backend/dist/modules/resume/render/create-resume-pdf.js");
const { adminMenuItems } = require("./packages/admin-contracts/dist/index.js");

test("빌드된 서버가 기본 경로에서 콘솔과 에셋을 제공하고 MCP 도구를 등록한다", async () => {
  const unavailable = async () => {
    throw new Error("UNEXPECTED_EXTERNAL_CALL");
  };
  const introspect = async () => ({ active: true, sub: "workspace-test" });
  const server = createResumeMcpServer({
    introspect,
    connection: unavailable,
    admin: {
      api: { request: unavailable },
      oauth: { startAuthorization: unavailable, exchangeCode: unavailable },
      publicUrl: "https://mcp.example.test/mcp",
      oauthResource: "https://mcp.example.test/mcp",
      authorizationOrigin: "https://api.example.test",
      introspect,
    },
  });
  server.listen(0, "127.0.0.1");
  try {
    await once(server, "listening");
    const origin = `http://127.0.0.1:${server.address().port}`;
    const login = await fetch(`${origin}/admin/ai-models/connect`);
    assert.equal(login.status, 200);
    const html = await login.text();
    const assets = [
      ...html.matchAll(/(?:src|href)="(\/admin\/ai-models\/assets\/[^" ]+)"/g),
    ];
    assert.ok(assets.length >= 2);
    for (const [, asset] of assets)
      assert.equal((await fetch(origin + asset)).status, 200);
    for (const item of adminMenuItems.filter((item) => item.path)) {
      const page = await fetch(origin + item.path, {
        headers: { cookie: "__Host-portfolio-admin-session=workspace-test" },
      });
      assert.equal(page.status, 200);
      assert.equal(await page.text(), html);
    }
    const result = await fetch(`${origin}/mcp`, {
      method: "POST",
      headers: {
        authorization: "Bearer workspace-test",
        "content-type": "application/json",
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
    });
    assert.equal(result.status, 200);
    const body = await result.json();
    assert.ok(
      body.result.tools.some((tool) => tool.name === "generate_resume"),
    );
    assert.ok(
      body.result.tools.some((tool) => tool.name === "convert_resume_to_pdf"),
    );
  } finally {
    server.closeAllConnections();
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});

test("빌드된 PDF 구현이 MCP 공통 폰트로 한글 PDF를 생성한다", async () => {
  const pdf = await createResumePdf({
    resume: "검증용 이력서",
    claims: [],
    selection: [],
  });
  assert.equal(pdf.subarray(0, 5).toString(), "%PDF-");
  assert.ok(pdf.byteLength > 1000);
});
