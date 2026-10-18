import { execFileSync } from "child_process";
import fs from "fs";
import path from "path";

describe("merge-gate workflow", () => {
  it("통합 테스트가 성공해야 머지 게이트가 통과한다", () => {
    const workflow = fs.readFileSync(
      path.join(__dirname, ".github/workflows/merge-gate.yml"),
      "utf8",
    );

    expect(workflow).toContain("integration-gate");
    expect(workflow).toContain("Integration");
    expect(workflow).toContain("integration-gate.sh");
  });

  it("Integration 결론이 없으면 게이트는 pending이다", () => {
    const output = execFileSync(
      "bash",
      [path.join(__dirname, ".github/scripts/integration-gate.spec.sh")],
      { encoding: "utf8" },
    );

    expect(output).toContain("ok  empty pending");
  });
});
