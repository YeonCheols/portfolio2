export {};

describe("jest.config", () => {
  afterEach(() => {
    jest.dontMock("next/jest");
    jest.resetModules();
  });

  it("next가 덮어쓴 변환 제외 목록을 ESM 패키지가 변환되도록 되돌린다", async () => {
    jest.resetModules();
    const nextJest = jest.fn(
      () => (customConfig: Record<string, unknown>) => async () => ({
        ...customConfig,
        transformIgnorePatterns: ["/node_modules/"],
      }),
    );
    jest.doMock("next/jest", () => nextJest);

    let createConfig = (): Promise<{
      testEnvironment: string;
      setupFilesAfterEnv: string[];
      moduleNameMapper: Record<string, string>;
      transformIgnorePatterns: string[];
    }> => Promise.reject(new Error("설정을 불러오지 못했습니다."));
    jest.isolateModules(() => {
      createConfig = require("../../jest.config");
    });

    const config = await createConfig();

    expect(nextJest).toHaveBeenCalledWith({ dir: "./" });
    expect(config.testEnvironment).toBe("jest-environment-jsdom");
    expect(config.setupFilesAfterEnv).toContain("<rootDir>/jest.setup.js");
    expect(config.moduleNameMapper["^@/(.*)$"]).toBe("<rootDir>/src/$1");
    expect(config.moduleNameMapper["^@yeoncheols/portfolio-core-ui$"]).toBe(
      "<rootDir>/src/test/portfolio-core-ui.tsx",
    );
    expect(config.transformIgnorePatterns).toEqual([
      expect.stringContaining("react-markdown"),
    ]);
  });

  it("통합 테스트 디렉터리는 Jest가 수집하지 않는다", async () => {
    jest.resetModules();
    const nextJest = jest.fn(
      () => (customConfig: Record<string, unknown>) => async () => ({
        ...customConfig,
        testPathIgnorePatterns: ["/node_modules/"],
      }),
    );
    jest.doMock("next/jest", () => nextJest);

    let createConfig = (): Promise<{
      testPathIgnorePatterns: string[];
    }> => Promise.reject(new Error("설정을 불러오지 못했습니다."));
    jest.isolateModules(() => {
      createConfig = require("../../jest.config");
    });

    const config = await createConfig();

    expect(config.testPathIgnorePatterns).toEqual(
      expect.arrayContaining(["<rootDir>/tests/integration/"]),
    );
  });
});
