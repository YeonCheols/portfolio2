import fs from "fs";
import path from "path";

const workflowPath = path.join(__dirname, "../../.github/workflows/deploy.yml");

describe("deploy workflow", () => {
  it("master 푸시에서 이미지를 빌드한다", () => {
    const workflow = fs.readFileSync(workflowPath, "utf8");

    expect(workflow).toMatch(/branches:\s*\n\s*-\s*master/);
    expect(workflow).toContain("docker/build-push-action");
    expect(workflow).toContain("GITHUB_NPM_TOKEN");
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
    expect(workflow.split("deploy-mcp")[0]).toContain(
      "RESUME_CONNECTION_TOKEN=RESUME_CONNECTION_TOKEN:latest",
    );
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

  it("MCP는 공개 주소에서 Bearer 비밀로만 도구를 연다", () => {
    const workflow = fs.readFileSync(workflowPath, "utf8");
    const mcpJob = workflow.split("deploy-mcp")[1];

    expect(mcpJob).toContain("Dockerfile.mcp");
    expect(mcpJob).toContain("gcloud run deploy portfolio-mcp");
    expect(mcpJob).toContain("--allow-unauthenticated");
    expect(mcpJob).not.toContain("--no-allow-unauthenticated");
    expect(mcpJob).toContain("MCP_AUTH_TOKEN=MCP_AUTH_TOKEN:latest");
    expect(workflow).toContain(
      "RESUME_CONNECTION_TOKEN=RESUME_CONNECTION_TOKEN:latest",
    );
    expect(workflow).toContain(
      'RESUME_CONNECTION_URL="${{ vars.RESUME_CONNECTION_URL }}"',
    );
  });
});
