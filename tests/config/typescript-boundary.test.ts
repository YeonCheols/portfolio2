import fs from "fs";
import path from "path";

describe("TypeScript project boundaries", () => {
  it("웹 프로젝트에서 MCP 소스를 제외하고 MCP를 자체 빌드한다", () => {
    const rootConfig = JSON.parse(
      fs.readFileSync(path.join(__dirname, "../../tsconfig.json"), "utf8"),
    ) as { exclude?: string[] };
    const ciWorkflow = fs.readFileSync(
      path.join(__dirname, "../../.github/workflows/ci.yml"),
      "utf8",
    );

    expect(rootConfig.exclude).toContain("mcp");
    expect(ciWorkflow).toContain("pnpm --dir mcp build");
  });
});
