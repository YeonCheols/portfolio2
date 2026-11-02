import fs from "fs";
import path from "path";

describe("MCP deployment workflow", () => {
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
    expect(mcpWorkflow).toContain("PORTFOLIO_API_URL");
    expect(mcpWorkflow).toContain("MCP_AUTH_SERVICE_TOKEN");
    expect(mcpWorkflow).toContain("--allow-unauthenticated");
    expect(mcpWorkflow).not.toContain("portfolio-mcp-oauth-auth");
    expect(mcpWorkflow).not.toContain("portfolio-mcp-oauth-gateway");
    expect(mcpWorkflow).not.toContain("MCP_OAUTH_SIGNING_PRIVATE_KEY");
  });
});
