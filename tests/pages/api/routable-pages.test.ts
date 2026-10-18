import fs from "fs";
import path from "path";

const pagesDir = path.join(process.cwd(), "src/pages");

const listFiles = (directory: string): string[] =>
  fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);

    return entry.isDirectory() ? listFiles(fullPath) : [fullPath];
  });

describe("pages 라우트", () => {
  it("테스트 파일은 라우트로 컴파일되지 않는다", () => {
    const routableTests = listFiles(pagesDir).filter((file) =>
      /\.test\.(ts|tsx|js|jsx)$/.test(file),
    );

    expect(routableTests).toEqual([]);
  });
});
