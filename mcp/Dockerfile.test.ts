import fs from "fs";
import path from "path";

describe("mcp container", () => {
  it("웹 이미지와 다른 진입점으로 MCP 서버만 실행한다", () => {
    const dockerfile = fs.readFileSync(
      path.join(__dirname, "Dockerfile"),
      "utf8",
    );

    expect(dockerfile).toContain("dist/server.js");
    expect(dockerfile).toContain("COPY package.json pnpm-lock.yaml ./");
    expect(dockerfile).toContain("COPY src ./src");
    expect(dockerfile).not.toContain("src/entities/resume");
    expect(dockerfile).not.toContain("resume.xml");
    expect(dockerfile).not.toContain("next start");
    expect(dockerfile).not.toContain("portfolio-web");
  });

  it("같은 MCP 프로젝트 소스로 OAuth 게이트웨이 이미지를 만든다", () => {
    const dockerfile = fs.readFileSync(
      path.join(__dirname, "Dockerfile.gateway"),
      "utf8",
    );

    expect(dockerfile).toContain("COPY src ./src");
    expect(dockerfile).toContain("COPY package.json pnpm-lock.yaml ./");
    expect(dockerfile).toContain("dist/gateway/server.js");
    expect(dockerfile).not.toContain("next start");
  });
});
