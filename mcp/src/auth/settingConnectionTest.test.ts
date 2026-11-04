import type { PortfolioAdminApi } from "@mcp/auth/adminApi";
import { createSettingConnectionTester } from "@mcp/auth/settingConnectionTest";

type ModelConnect = Parameters<
  typeof createSettingConnectionTester
>[0]["connections"][string];

const row = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  environment: "production",
  provider: "openrouter",
  modelName: "vendor/model-a",
  url: "https://openrouter.ai/api/v1/chat/completions",
  hasApiKey: true,
  apiKey: "key-a",
  isActive: false,
  ...overrides,
});

const apiReturning = (value: unknown) =>
  ({
    request: jest.fn().mockResolvedValue(value),
  }) as unknown as PortfolioAdminApi & {
    request: jest.Mock;
  };

describe("createSettingConnectionTester", () => {
  it("선택한 id의 설정과 그 키로만 모델을 호출하고 목록 경로를 읽는다", async () => {
    const api = apiReturning([
      row({ id: 1, modelName: "vendor/model-a", apiKey: "key-a" }),
      row({ id: 2, modelName: "vendor/model-b", apiKey: "key-b" }),
    ]);
    const connect = jest.fn<ReturnType<ModelConnect>, Parameters<ModelConnect>>(
      async () => ({ text: "ok", raw: {} }),
    );
    const test = createSettingConnectionTester({
      api,
      connections: { openrouter: connect },
    });

    const result = await test({ id: 2, environment: "production" });

    expect(result.ok).toBe(true);
    expect(api.request).toHaveBeenCalledWith("/service/resume-model-setting");
    // 일반 호출과 구조화 호출이 모두 선택한 설정의 모델과 키만 쓴다
    expect(connect).toHaveBeenCalledTimes(2);
    for (const [, options] of connect.mock.calls) {
      expect(options).toMatchObject({
        model: "vendor/model-b",
        token: "key-b",
      });
    }
  });

  it("목록에 없는 id는 다른 설정으로 대체하지 않고 SETTING_NOT_FOUND를 반환한다", async () => {
    const connect = jest.fn<ReturnType<ModelConnect>, Parameters<ModelConnect>>(
      async () => ({ text: "ok", raw: {} }),
    );
    const test = createSettingConnectionTester({
      api: apiReturning([row({ id: 1, isActive: true })]),
      connections: { openrouter: connect },
    });

    await expect(test({ id: 9, environment: "production" })).resolves.toEqual({
      ok: false,
      code: "SETTING_NOT_FOUND",
    });
    expect(connect).not.toHaveBeenCalled();
  });

  it("요청한 환경이 설정의 환경과 다르면 ENVIRONMENT_MISMATCH로 거절하고 호출하지 않는다", async () => {
    const connect = jest.fn<ReturnType<ModelConnect>, Parameters<ModelConnect>>(
      async () => ({ text: "ok", raw: {} }),
    );
    const test = createSettingConnectionTester({
      api: apiReturning([row({ id: 1, environment: "production" })]),
      connections: { openrouter: connect },
    });

    await expect(test({ id: 1, environment: "development" })).resolves.toEqual({
      ok: false,
      code: "ENVIRONMENT_MISMATCH",
    });
    expect(connect).not.toHaveBeenCalled();
  });

  it("키가 없거나 공백이면 호출하지 않고 API_KEY_MISSING을 반환한다", async () => {
    const connect = jest.fn<ReturnType<ModelConnect>, Parameters<ModelConnect>>(
      async () => ({ text: "ok", raw: {} }),
    );

    for (const apiKey of [null, "", "   "]) {
      const test = createSettingConnectionTester({
        api: apiReturning([row({ apiKey, hasApiKey: false })]),
        connections: { openrouter: connect },
      });

      await expect(test({ id: 1, environment: "production" })).resolves.toEqual(
        { ok: false, code: "API_KEY_MISSING" },
      );
    }
    expect(connect).not.toHaveBeenCalled();
  });

  it("설정 목록을 읽지 못하거나 배열이 아니면 SETTING_UNAVAILABLE을 반환하고 원본 오류를 싣지 않는다", async () => {
    const connect = jest.fn<ReturnType<ModelConnect>, Parameters<ModelConnect>>(
      async () => ({ text: "ok", raw: {} }),
    );
    const failing = {
      request: jest.fn().mockRejectedValue(new Error("secret-token leaked")),
    } as unknown as PortfolioAdminApi;

    for (const api of [failing, apiReturning({ not: "an array" })]) {
      const test = createSettingConnectionTester({
        api,
        connections: { openrouter: connect },
      });
      const result = await test({ id: 1, environment: "production" });

      expect(result).toEqual({ ok: false, code: "SETTING_UNAVAILABLE" });
      expect(JSON.stringify(result)).not.toContain("secret-token");
    }
    expect(connect).not.toHaveBeenCalled();
  });

  it("https가 아닌 주소나 빈 공급자·모델 이름은 키를 보내지 않고 SETTING_INVALID를 반환한다", async () => {
    const connect = jest.fn<ReturnType<ModelConnect>, Parameters<ModelConnect>>(
      async () => ({ text: "ok", raw: {} }),
    );
    const invalid = [
      { url: "http://openrouter.ai/api/v1/chat/completions" },
      { url: "not a url" },
      { modelName: "" },
      { provider: "" },
    ];

    for (const overrides of invalid) {
      const test = createSettingConnectionTester({
        api: apiReturning([row(overrides)]),
        connections: { openrouter: connect },
      });

      await expect(test({ id: 1, environment: "production" })).resolves.toEqual(
        { ok: false, code: "SETTING_INVALID" },
      );
    }
    expect(connect).not.toHaveBeenCalled();
  });
});
