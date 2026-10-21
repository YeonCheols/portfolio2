export {};

jest.mock("@playwright/test", () => ({
  defineConfig: (config: unknown) => config,
  devices: { "Desktop Chrome": {} },
}));

describe("playwright.config", () => {
  beforeEach(() => {
    jest.replaceProperty(process, "env", { ...process.env });
    jest.resetModules();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetModules();
  });

  it("통합 테스트를 tests/integration에서 프로덕션 서버로 실행한다", () => {
    const config = require("../../playwright.config").default as {
      testDir: string;
      webServer: { command: string; reuseExistingServer: boolean };
    };

    expect(config.testDir).toContain("tests/integration");
    expect(config.webServer.command).toContain("pnpm build");
    expect(config.webServer.command).toContain("pnpm start");
    expect(config.webServer.reuseExistingServer).toBe(!process.env.CI);
  });

  it("CI에서는 html 리포트를 남긴다", () => {
    process.env.CI = "true";

    const config = require("../../playwright.config").default as {
      reporter: unknown;
    };

    expect(JSON.stringify(config.reporter)).toContain("html");
  });
});
