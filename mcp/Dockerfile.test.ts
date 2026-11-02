import fs from "fs";
import path from "path";

describe("mcp container", () => {
  it("웹 이미지와 다른 진입점으로 MCP 서버만 실행한다", () => {
    const dockerfile = fs.readFileSync(
      path.join(__dirname, "Dockerfile"),
      "utf8",
    );

    expect(dockerfile).toContain("dist/resume/http/server.js");
    expect(dockerfile).toContain("COPY package.json pnpm-lock.yaml ./");
    expect(dockerfile).toContain("COPY src ./src");
    expect(dockerfile).not.toContain("src/entities/resume");
    expect(dockerfile).not.toContain("resume.xml");
    expect(dockerfile).not.toContain("next start");
    expect(dockerfile).not.toContain("portfolio-web");
  });

  it("한글 PDF 렌더링 폰트를 MCP 이미지에 포함한다", () => {
    const dockerfile = fs.readFileSync(
      path.join(__dirname, "Dockerfile"),
      "utf8",
    );

    expect(dockerfile).toContain("COPY fonts ./fonts");
  });

  it("MCP 프로젝트에는 별도 OAuth 컨테이너가 없다", () => {
    expect(fs.existsSync(path.join(__dirname, "Dockerfile.gateway"))).toBe(
      false,
    );
    expect(fs.existsSync(path.join(__dirname, "Dockerfile.auth"))).toBe(false);
  });

  it("alias를 되돌리는 빌드 스크립트를 이미지에 넣는다", () => {
    const dockerfile = fs.readFileSync(
      path.join(__dirname, "Dockerfile"),
      "utf8",
    );
    expect(dockerfile).toContain("COPY scripts ./scripts");
  });
});
