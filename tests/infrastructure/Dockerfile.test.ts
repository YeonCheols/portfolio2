import fs from "fs";
import path from "path";

const dockerfile = fs
  .readFileSync(path.join(__dirname, "../../Dockerfile"), "utf8")
  .split("\n")
  .filter((line) => !line.trim().startsWith("#"))
  .join("\n");

describe("Dockerfile", () => {
  it("standalone과 static, public을 복사한다", () => {
    expect(dockerfile).toContain(".next/standalone");
    expect(dockerfile).toContain(".next/static");
    expect(dockerfile).toMatch(/COPY --from=builder[^\n]*public/);
  });

  it("진입점은 standalone server.js이다", () => {
    expect(dockerfile).not.toContain("next start");
    expect(dockerfile).toContain("node server.js");
  });

  it("PORT와 0.0.0.0 호스트를 쓴다", () => {
    expect(dockerfile).toMatch(/ENV PORT/);
    expect(dockerfile).toContain('HOSTNAME="0.0.0.0"');
  });

  it("pnpm과 GITHUB_NPM_TOKEN으로 패키지를 설치한다", () => {
    expect(dockerfile).toContain("pnpm");
    expect(dockerfile).toContain("GITHUB_NPM_TOKEN");
    expect(dockerfile).toContain(".npmrc");
  });

  it("CI와 같이 pnpm 9를 쓴다", () => {
    expect(dockerfile).toContain("pnpm@9");
    expect(dockerfile).not.toContain("pnpm@latest");
  });

  it("NEXT_PUBLIC_ 토큰 ARG를 두지 않는다", () => {
    expect(dockerfile).not.toContain("NEXT_PUBLIC_GITHUB_ACCESS_TOKEN");
    expect(dockerfile).not.toContain("NEXT_PUBLIC_WAKATIME_API_KEY");
  });

  it(".env와 서비스 계정 JSON을 복사하지 않는다", () => {
    expect(dockerfile).not.toMatch(/COPY[^\n]*\.env/);
    expect(dockerfile).not.toMatch(
      /COPY[^\n]*(credentials|service[-_]?account)[^\n]*\.json/i,
    );
  });
});
