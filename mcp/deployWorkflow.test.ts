import fs from "fs";
import path from "path";

describe("MCP OAuth deployment workflow", () => {
  it("웹 배포 workflow에서 MCP 서비스 배포를 분리한다", () => {
    const webWorkflow = fs.readFileSync(
      path.join(__dirname, "../.github/workflows/deploy.yml"),
      "utf8",
    );
    const mcpWorkflow = fs.readFileSync(
      path.join(__dirname, "../.github/workflows/deploy-mcp.yml"),
      "utf8",
    );

    expect(webWorkflow).not.toContain("deploy-mcp:");
    expect(webWorkflow).not.toContain("portfolio-mcp-oauth-auth");
    expect(webWorkflow).not.toContain("portfolio-mcp-oauth-gateway");
    expect(mcpWorkflow).toContain("paths:");
    expect(mcpWorkflow).toContain("mcp/**");
    expect(mcpWorkflow).toContain("portfolio-mcp-oauth-auth");
    expect(mcpWorkflow).toContain("portfolio-mcp-oauth-gateway");
  });

  it("예약된 GITHUB_ 접두사 없이 Actions에서 GitHub App Client ID를 전달한다", () => {
    const workflow = fs.readFileSync(
      path.join(__dirname, "../.github/workflows/deploy-mcp.yml"),
      "utf8",
    );

    expect(workflow).toContain(
      'GITHUB_OAUTH_CLIENT_ID="${{ vars.MCP_GITHUB_OAUTH_CLIENT_ID }}"',
    );
    expect(workflow).not.toContain("vars.GITHUB_OAUTH_CLIENT_ID");
  });

  it("런타임 Secret 접근은 미리 설정하고 배포 계정이 Secret IAM 정책을 수정하지 않는다", () => {
    const workflow = fs.readFileSync(
      path.join(__dirname, "../.github/workflows/deploy-mcp.yml"),
      "utf8",
    );

    expect(workflow).not.toContain("gcloud secrets add-iam-policy-binding");
    expect(workflow).toContain("roles/run.invoker");
    expect(workflow).toContain("GCP_MCP_AUTH_RUNTIME_SERVICE_ACCOUNT");
  });

  it("별도 인증서버가 자체 런타임 계정과 OAuth 비밀로 배포된다", () => {
    const workflow = fs.readFileSync(
      path.join(__dirname, "../.github/workflows/deploy-mcp.yml"),
      "utf8",
    );

    expect(workflow).toContain("portfolio-mcp-oauth-auth");
    expect(workflow).toContain("GCP_MCP_AUTH_RUNTIME_SERVICE_ACCOUNT");
    expect(workflow).toContain(
      "GITHUB_OAUTH_CLIENT_SECRET=GITHUB_OAUTH_CLIENT_SECRET:latest",
    );
    expect(workflow).toContain(
      "MCP_OAUTH_SIGNING_PRIVATE_KEY=MCP_OAUTH_SIGNING_PRIVATE_KEY:latest",
    );
    expect(workflow).toContain("--max=1");
  });

  it("인증서버 issuer를 조회해 게이트웨이 설정에 전달한다", () => {
    const workflow = fs.readFileSync(
      path.join(__dirname, "../.github/workflows/deploy-mcp.yml"),
      "utf8",
    );

    expect(workflow).toContain("--format='value(status.url)'");
    expect(workflow).toContain("steps.deploy-auth.outputs.issuer");
    expect(workflow).not.toContain("AUTH0_ISSUER");
  });

  it("인증서버는 canonical issuer 설정 후 공개 호출을 허용한다", () => {
    const workflow = fs.readFileSync(
      path.join(__dirname, "../.github/workflows/deploy-mcp.yml"),
      "utf8",
    );
    const setIssuer = workflow.indexOf(
      '--update-env-vars="MCP_AUTH_ISSUER=${AUTH_ISSUER}"',
    );
    const allowPublic = workflow.indexOf(
      "services add-iam-policy-binding portfolio-mcp-oauth-auth",
    );

    expect(workflow).toContain("--no-allow-unauthenticated");
    expect(allowPublic).toBeGreaterThan(setIssuer);
    expect(workflow).toContain("--member=allUsers");
  });
});
