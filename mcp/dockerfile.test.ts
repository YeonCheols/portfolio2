import fs from "fs";
import path from "path";

describe("mcp container", () => {
  it("검증용 workspace는 운영 설정 CLI 없이도 빌드할 수 있다", () => {
    const dockerfile = fs.readFileSync(
      path.join(__dirname, "Dockerfile"),
      "utf8",
    );
    const workspace = dockerfile.split("FROM workspace AS local")[0];
    expect(workspace).toContain("FROM node:20-alpine AS workspace");
    expect(workspace).not.toContain("COPY --from=configcli");
    expect(workspace).toContain("jest.config.cjs");
  });

  it("웹 이미지와 다른 진입점으로 MCP 서버만 실행한다", () => {
    const dockerfile = fs.readFileSync(
      path.join(__dirname, "Dockerfile"),
      "utf8",
    );

    expect(dockerfile).toContain("apps/backend/dist/bootstrap/server.js");
    expect(dockerfile).toContain(
      "COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./",
    );
    expect(dockerfile).toContain("COPY apps ./apps");
    expect(dockerfile).not.toContain("src/entities/resume");
    expect(dockerfile).not.toContain("resume.xml");
    expect(dockerfile).not.toContain("next start");
    expect(dockerfile).not.toContain("portfolio-web");
  });

  it("컨테이너 빌드 전에 관리자 React 앱 소스를 복사한다", () => {
    const dockerfile = fs.readFileSync(
      path.join(__dirname, "Dockerfile"),
      "utf8",
    );

    expect(dockerfile).toContain("COPY apps ./apps");
    expect(dockerfile.indexOf("COPY apps ./apps")).toBeLessThan(
      dockerfile.indexOf("RUN pnpm build"),
    );
  });

  it("컨테이너 시작 시 중앙 설정을 읽는 CLI와 진입점을 포함한다", () => {
    const dockerfile = fs.readFileSync(
      path.join(__dirname, "Dockerfile"),
      "utf8",
    );
    expect(dockerfile).toContain(
      "COPY --from=configcli /portfolio-config /usr/local/bin/portfolio-config",
    );
    expect(dockerfile).toContain(
      'ENTRYPOINT ["sh", "scripts/start-with-config.sh"]',
    );
    expect(dockerfile).toContain("github-cli");
    expect(dockerfile).not.toContain("cli-v0.2.1");
    expect(dockerfile).toContain("install-config-cli.sh");
    expect(dockerfile).not.toContain("ENV GH_TOKEN");
  });

  it("한글 PDF 렌더링 폰트를 MCP 이미지에 포함한다", () => {
    const dockerfile = fs.readFileSync(
      path.join(__dirname, "Dockerfile"),
      "utf8",
    );

    expect(dockerfile).toContain("COPY fonts ./fonts");
  });

  it("alias를 되돌리는 빌드 스크립트를 이미지에 넣는다", () => {
    const dockerfile = fs.readFileSync(
      path.join(__dirname, "Dockerfile"),
      "utf8",
    );
    expect(dockerfile).toContain("COPY scripts ./scripts");
  });
});
