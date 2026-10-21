import fs from "fs";
import path from "path";

const dockerignore = fs.readFileSync(
  path.join(__dirname, "../../.dockerignore"),
  "utf8",
);

describe(".dockerignore", () => {
  it("빌드에 필요한 docs/api를 제외하지 않는다", () => {
    expect(dockerignore).not.toMatch(/^docs\/\s*$/m);
  });
});
