import fs from "fs";
import path from "path";

describe("MCP deployment workflow", () => {
  it("컨테이너 빌드에 관리자 화면 스타일 설정을 포함한다", () => {
    const dockerfile = fs.readFileSync(
      path.join(__dirname, "Dockerfile"),
      "utf8",
    );

    expect(dockerfile).toContain(
      "COPY tailwind.config.js ./tailwind.config.js",
    );
    expect(dockerfile.indexOf("COPY tailwind.config.js")).toBeLessThan(
      dockerfile.indexOf("RUN pnpm build"),
    );
  });

  it("컨테이너 빌드 전에 관리자 React 앱 소스를 복사한다", () => {
    const dockerfile = fs.readFileSync(
      path.join(__dirname, "Dockerfile"),
      "utf8",
    );

    expect(dockerfile).toContain("COPY app ./app");
    expect(dockerfile.indexOf("COPY app ./app")).toBeLessThan(
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
    expect(mcpWorkflow).toContain("PORTFOLIO_API_URL");
    expect(mcpWorkflow).toContain("MCP_AUTH_SERVICE_TOKEN");
    expect(mcpWorkflow).toContain("--allow-unauthenticated");
    expect(mcpWorkflow).not.toContain("portfolio-mcp-oauth-auth");
    expect(mcpWorkflow).not.toContain("portfolio-mcp-oauth-gateway");
    expect(mcpWorkflow).not.toContain("MCP_OAUTH_SIGNING_PRIVATE_KEY");
  });
});
