import fs from "fs";
import path from "path";

describe("mcp runtime boundary", () => {
  it("런타임 소스는 이력서 엔티티와 기준 XML 파일을 직접 가져오지 않는다", () => {
    const sources = fs
      .readdirSync(__dirname)
      .filter((name) => name.endsWith(".ts") && !name.endsWith(".test.ts"))
      .map((name) => fs.readFileSync(path.join(__dirname, name), "utf8"))
      .join("\n");

    expect(sources).not.toContain("entities/resume");
    expect(sources).not.toContain("resume.xml");
    expect(sources).not.toContain("parseResumeXml");
  });
});
