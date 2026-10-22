import fs from "fs";
import path from "path";

const workflowPath = path.join(__dirname, "../../.github/workflows/deploy.yml");
const mcpWorkflowPath = path.join(
  __dirname,
  "../../.github/workflows/deploy-mcp.yml",
);

describe("deploy workflow", () => {
  it("master 푸시에서 이미지를 빌드한다", () => {
    const workflow = fs.readFileSync(workflowPath, "utf8");

    expect(workflow).toMatch(/branches:\s*\n\s*-\s*master/);
    expect(workflow).toContain("docker/build-push-action");
    expect(workflow).toContain("GITHUB_NPM_TOKEN");
  });

  it("MCP 변경만 반영할 때 웹 배포 workflow를 실행하지 않는다", () => {
    const workflow = fs.readFileSync(workflowPath, "utf8");
    const ignoredPaths = workflow.split("paths-ignore:\n")[1] ?? "";

    expect(ignoredPaths).toContain('      - "mcp/**"');
    expect(ignoredPaths).toContain('      - "AGENTS.md"');
    expect(ignoredPaths).toContain('      - ".cursor/rules/agents.mdc"');
    expect(ignoredPaths).toContain('      - ".github/copilot-instructions.md"');
    expect(ignoredPaths).toContain('      - ".github/workflows/deploy.yml"');
    expect(ignoredPaths).toContain(
      '      - ".github/workflows/deploy-mcp.yml"',
    );
    expect(ignoredPaths).toContain(
      '      - "tests/infrastructure/deploy.workflow.test.ts"',
    );
  });

  it("Artifact Registry에 이미지를 푸시한다", () => {
    const workflow = fs.readFileSync(workflowPath, "utf8");

    expect(workflow).toContain("docker.pkg.dev");
    expect(workflow).toMatch(/push:\s*true/);
  });

  it("Cloud Run 서비스에 이미지를 올린다", () => {
    const workflow = fs.readFileSync(workflowPath, "utf8");

    expect(workflow).toContain("gcloud run deploy");
  });

  it("WIF로 GCP에 인증하고 키 JSON을 쓰지 않는다", () => {
    const workflow = fs.readFileSync(workflowPath, "utf8");

    expect(workflow).toContain("workload_identity_provider");
    expect(workflow).not.toContain("credentials_json");
    expect(workflow).not.toContain("GOOGLE_APPLICATION_CREDENTIALS");
  });

  it("Cloud Run 런타임 비밀은 Secret Manager 이름을 참조한다", () => {
    const workflow = fs.readFileSync(workflowPath, "utf8");

    expect(workflow).toContain("--set-secrets");
    expect(workflow).toContain(
      "GITHUB_ACCESS_TOKEN=GITHUB_ACCESS_TOKEN:latest",
    );
    expect(workflow).toContain("WAKATIME_API_KEY=WAKATIME_API_KEY:latest");
    expect(workflow).toContain("API_URL=API_URL:latest");
    expect(workflow).toContain(
      "RESUME_CONNECTION_TOKEN=RESUME_CONNECTION_TOKEN:latest",
    );
    expect(workflow).not.toContain("portfolio-mcp");
    expect(workflow).not.toContain("NEXT_PUBLIC_GITHUB_ACCESS_TOKEN");
    expect(workflow).not.toContain("NEXT_PUBLIC_WAKATIME_API_KEY");
  });

  it("Cloud Run이 배포 서비스 계정으로 뜨고 공개 접근을 허용한다", () => {
    const workflow = fs.readFileSync(workflowPath, "utf8");

    expect(workflow).toContain(
      "--service-account=${{ vars.GCP_DEPLOY_SERVICE_ACCOUNT }}",
    );
    expect(workflow).toContain("--allow-unauthenticated");
  });

  it("MCP는 별도 Cloud Run 서비스로 배포하고 공개 접근을 열지 않는다", () => {
    const workflow = fs.readFileSync(mcpWorkflowPath, "utf8");

    expect(workflow).toContain("context: ./mcp");
    expect(workflow).toContain("gcloud run deploy portfolio-mcp");
    expect(workflow).toContain("--no-allow-unauthenticated");
    expect(workflow).toContain("MCP_AUTH_TOKEN=MCP_AUTH_TOKEN:latest");
    expect(workflow).toContain(
      "RESUME_CONNECTION_TOKEN=RESUME_CONNECTION_TOKEN:latest",
    );
    expect(workflow).toContain(
      'RESUME_CONNECTION_URL="${{ vars.RESUME_CONNECTION_URL }}"',
    );
  });

  it("MCP 이미지 빌드는 mcp 컨텍스트의 기본 Dockerfile을 사용한다", () => {
    const workflow = fs.readFileSync(mcpWorkflowPath, "utf8");
    const mcpBuildStep = workflow
      .split("      - name: MCP 이미지 빌드와 푸시\n")[1]
      ?.split("\n      - name: 비공개 MCP 서버 배포")[0];

    expect(mcpBuildStep).toBeDefined();
    expect(mcpBuildStep).toContain("uses: docker/build-push-action@v6");
    expect(mcpBuildStep).toContain("context: ./mcp");
    expect(mcpBuildStep).not.toMatch(/^\s*file:/m);
  });
});
