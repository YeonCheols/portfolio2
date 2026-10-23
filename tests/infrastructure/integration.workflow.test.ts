import fs from "fs";
import path from "path";

describe("integration workflow", () => {
  it("단위 테스트 워크플로와 따로 통합 테스트를 실행한다", () => {
    const workflow = fs.readFileSync(
      path.join(__dirname, "../../.github/workflows/integration.yml"),
      "utf8",
    );

    expect(workflow).toContain("name: Integration");
    expect(workflow).toContain("pnpm test:integration");
    expect(workflow).not.toContain("pnpm test:ci");
  });

  it("Chromium 바이너리만 설치하고 시스템 패키지는 받지 않는다", () => {
    const workflow = fs.readFileSync(
      path.join(__dirname, "../../.github/workflows/integration.yml"),
      "utf8",
    );

    expect(workflow).toContain("pnpm exec playwright install chromium");
    expect(workflow).not.toContain("--with-deps");
  });
});
