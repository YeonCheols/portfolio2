const nextConfig = require("./next.config");

describe("next.config", () => {
  const webpackConfig = () => ({ resolve: {} });

  it("개발 클라이언트 빌드면 폴링 감시를 켠다", () => {
    const config = webpackConfig();

    const result = nextConfig.webpack(config, { dev: true, isServer: false });

    expect(result.watchOptions).toEqual({
      poll: 1000,
      aggregateTimeout: 300,
    });
    expect(result.resolve.extensionAlias).toEqual({
      ".js": [".js", ".ts", ".tsx"],
      ".mjs": [".mjs", ".mts"],
    });
  });

  it("서버 빌드면 폴링 감시를 바꾸지 않는다", () => {
    const config = webpackConfig();

    const result = nextConfig.webpack(config, { dev: true, isServer: true });

    expect(result.watchOptions).toBeUndefined();
    expect(result.resolve.extensionAlias[".mjs"]).toEqual([".mjs", ".mts"]);
  });

  it("프로덕션 클라이언트 빌드면 폴링 감시를 바꾸지 않는다", () => {
    const config = webpackConfig();

    const result = nextConfig.webpack(config, { dev: false, isServer: false });

    expect(result.watchOptions).toBeUndefined();
  });

  it("프로덕션 출력은 standalone이다", () => {
    expect(nextConfig.output).toBe("standalone");
  });

  it("로컬 출처와 https 원격 이미지를 허용한다", () => {
    expect(nextConfig.reactStrictMode).toBe(false);
    expect(nextConfig.allowedDevOrigins).toEqual(["local.ycseng.com"]);
    expect(nextConfig.images.qualities).toEqual([75, 100]);
    expect(nextConfig.images.remotePatterns).toEqual([
      { protocol: "https", hostname: "**" },
    ]);
    expect(nextConfig.transpilePackages).toContain(
      "@yeoncheols/portfolio-core-ui",
    );
  });
});
