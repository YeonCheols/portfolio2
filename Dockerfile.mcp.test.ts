import fs from "fs";
import path from "path";

describe("mcp container", () => {
  it("웹 이미지와 다른 진입점으로 MCP 서버만 실행한다", () => {
    const dockerfile = fs.readFileSync(
      path.join(__dirname, "Dockerfile.mcp"),
      "utf8",
    );

    expect(dockerfile).toContain("mcp/dist/mcp/server.js");
    expect(dockerfile).not.toContain("src/entities/resume");
    expect(dockerfile).not.toContain("resume.xml");
    expect(dockerfile).not.toContain("next start");
    expect(dockerfile).not.toContain("portfolio-web");
  });
});
