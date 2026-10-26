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

  it("같은 MCP 프로젝트 소스로 독립 OAuth 인증서버 이미지를 만든다", () => {
    const dockerfile = fs.readFileSync(
      path.join(__dirname, "Dockerfile.auth"),
      "utf8",
    );

    expect(dockerfile).toContain("COPY src ./src");
    expect(dockerfile).toContain("COPY package.json pnpm-lock.yaml ./");
    expect(dockerfile).toContain("dist/auth/server.js");
    expect(dockerfile).not.toContain("next start");
  });

  it("alias를 되돌리는 빌드 스크립트를 이미지에 넣는다", () => {
    for (const fileName of [
      "Dockerfile",
      "Dockerfile.gateway",
      "Dockerfile.auth",
    ]) {
      const dockerfile = fs.readFileSync(
        path.join(__dirname, fileName),
        "utf8",
      );

      expect(dockerfile).toContain("COPY scripts ./scripts");
    }
  });
});
