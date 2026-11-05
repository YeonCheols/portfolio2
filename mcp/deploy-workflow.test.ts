import fs from "fs";
import path from "path";

describe("MCP deployment workflow", () => {
  it("컨테이너 빌드 전에 관리자 React 앱 소스를 복사한다", () => {
    const dockerfile = fs.readFileSync(
      path.join(__dirname, "Dockerfile"),
      "utf8",
    );

    expect(dockerfile).toContain("COPY apps ./apps");
    expect(dockerfile.indexOf("COPY apps ./apps")).toBeLessThan(
      dockerfile.indexOf("RUN pnpm build"),
    );
  });

  it("portfolio-api introspection을 사용하는 MCP 서버만 배포한다", () => {
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
    expect(mcpWorkflow).toContain("portfolio-mcp");
    expect(mcpWorkflow).toContain("cli-v0.2.1");
    expect(mcpWorkflow).toContain(
      "configcli=${{ runner.temp }}/portfolio-config-bin",
    );
    expect(mcpWorkflow).toContain(
      "--set-secrets=GH_TOKEN=PORTFOLIO_CONFIG_READ_TOKEN:latest",
    );
    expect(mcpWorkflow).toContain("PORTFOLIO_CONFIG_ENVIRONMENT=production");
    expect(mcpWorkflow).not.toContain("portfolio-config run");
    expect(mcpWorkflow).not.toContain("--env-vars-file");
    expect(mcpWorkflow).not.toContain("vars.PORTFOLIO_API_URL");
    expect(mcpWorkflow).not.toContain("secrets.RESUME_MODEL_TOKEN");
    expect(mcpWorkflow).not.toContain("vars.RESUME_MODEL_URL");
    expect(mcpWorkflow).not.toContain("secrets.PORTFOLIO_CONFIG_READ_TOKEN");
    expect(mcpWorkflow).toContain("--allow-unauthenticated");
    expect(mcpWorkflow).not.toContain("portfolio-mcp-oauth-auth");
    expect(mcpWorkflow).not.toContain("portfolio-mcp-oauth-gateway");
    expect(mcpWorkflow).not.toContain("MCP_OAUTH_SIGNING_PRIVATE_KEY");
  });
});
