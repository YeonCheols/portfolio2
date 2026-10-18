import fs from "fs";
import path from "path";

describe("image workflow", () => {
  it("이미지를 빌드하고 Cloud Run에 배포하지 않는다", () => {
    const workflow = fs.readFileSync(
      path.join(__dirname, ".github/workflows/image.yml"),
      "utf8",
    );

    expect(workflow).toContain("docker");
    expect(workflow).toContain("GITHUB_NPM_TOKEN");
    expect(workflow).not.toContain("gcloud run deploy");
  });
});
