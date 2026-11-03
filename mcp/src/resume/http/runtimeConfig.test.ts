import { readMcpRuntimeConfig } from "@mcp/resume/http/runtimeConfig";

const environment = () => ({
  PORTFOLIO_API_URL: "https://api.example.test",
  PORTFOLIO_API_AUTH_ISSUER: "https://api.example.test/auth",
  MCP_PUBLIC_URL: "https://mcp.example.test/mcp",
  MCP_AUTH_SERVICE_TOKEN: "fake-service-token",
  RESUME_CONNECTION_URL: "https://resume.example.test/api/resume-model",
  RESUME_CONNECTION_TOKEN: "fake-resume-token",
  RESUME_MODEL_SETTING_URL:
    "https://api.example.test/resume-model-setting/active",
  RESUME_MODEL_SETTING_TOKEN: "fake-setting-token",
  RESUME_MODEL_ENVIRONMENT: "production",
});

describe("readMcpRuntimeConfig", () => {
  it("정적 연결 정보만 준비하고 모델 이름과 모델 키는 설정에 포함하지 않는다", () => {
    const config = readMcpRuntimeConfig({
      ...environment(),
      RESUME_MODEL_TOKEN: "legacy-token",
      RESUME_MODEL_NAME: "legacy-model",
    });
    expect(config.api).toEqual({
      apiUrl: "https://api.example.test",
      serviceToken: "fake-service-token",
    });
    expect(config.modelSetting).toEqual({
      settingUrl: environment().RESUME_MODEL_SETTING_URL,
      settingToken: "fake-setting-token",
      environment: "production",
    });
    expect(config.server.port).toBe(8080);
    expect(JSON.stringify(config)).not.toMatch(/legacy-token|legacy-model/);
  });
  it.each([
    "MCP_AUTH_SERVICE_TOKEN",
    "RESUME_CONNECTION_TOKEN",
    "RESUME_MODEL_SETTING_TOKEN",
  ])("%s가 없으면 시작 전에 거부한다", (key) => {
    const env: Record<string, string | undefined> = environment();
    delete env[key];
    expect(() => readMcpRuntimeConfig(env)).toThrow(key);
  });
  it.each(["0", "65536", "NaN", "1.5", "-1"])(
    "PORT가 %s이면 시작 전에 거부한다",
    (PORT) => {
      expect(() => readMcpRuntimeConfig({ ...environment(), PORT })).toThrow(
        /PORT/,
      );
    },
  );
  it("개발 환경은 로컬 API를 허용하고 운영 환경은 HTTP 연결을 거부한다", () => {
    const local = {
      ...environment(),
      PORTFOLIO_API_URL: "http://localhost:3001",
      RESUME_MODEL_ENVIRONMENT: "development",
    };
    expect(readMcpRuntimeConfig(local).api.apiUrl).toBe(
      "http://localhost:3001",
    );
    expect(() =>
      readMcpRuntimeConfig({
        ...local,
        RESUME_MODEL_ENVIRONMENT: "production",
      }),
    ).toThrow(/PORTFOLIO_API_URL/);
  });
});
