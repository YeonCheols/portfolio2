import fs from "fs";
import path from "path";

describe("mcp runtime boundary", () => {
  it("런타임 소스는 이력서 엔티티와 기준 XML 파일을 직접 가져오지 않는다", () => {
    const readSourceFiles = (directory: string): string[] =>
      fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        const entryPath = path.join(directory, entry.name);
        if (entry.isDirectory()) return readSourceFiles(entryPath);
        if (!entry.name.endsWith(".ts") || entry.name.endsWith(".test.ts")) {
          return [];
        }
        return [fs.readFileSync(entryPath, "utf8")];
      });
    const sources = readSourceFiles(__dirname).join("\n");

    expect(sources).not.toContain("entities/resume");
    expect(sources).not.toContain("resume.xml");
    expect(sources).not.toContain("parseResumeXml");
  });

  it("내부 모듈은 @mcp alias로만 가져온다", () => {
    const readTypeScriptFiles = (directory: string): string[] =>
      fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        const entryPath = path.join(directory, entry.name);
        if (entry.isDirectory()) return readTypeScriptFiles(entryPath);
        return entry.name.endsWith(".ts") ? [entryPath] : [];
      });
    const relativeImports = readTypeScriptFiles(__dirname).flatMap((file) => {
      const source = fs.readFileSync(file, "utf8");
      return [
        ...source.matchAll(
          /\b(?:from\s+|import\s+|require\s*\(\s*)["'](\.[^"']+)["']/g,
        ),
      ].map((match) => `${path.relative(__dirname, file)} ${match[1]}`);
    });

    expect(relativeImports).toEqual([]);
  });
});
