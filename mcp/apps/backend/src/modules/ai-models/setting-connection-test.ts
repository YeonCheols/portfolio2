import type { PortfolioAdminApi } from "@mcp/infrastructure/portfolio-api/admin-api";
import {
  testModelConnection,
  type ModelConnect,
  type ModelConnectionTestResult,
} from "@mcp/infrastructure/ai/test-model-connection";
import type { ResumeConnectionFetch } from "@mcp/infrastructure/connection/connection";

export type SettingConnectionTester = (input: {
  id: number;
  environment: string;
}) => Promise<ModelConnectionTestResult>;

export type SettingConnectionTesterOptions = {
  api: PortfolioAdminApi;
  connections: Record<string, ModelConnect>;
  fetchImpl?: ResumeConnectionFetch;
  timeoutMs?: number;
};

type ListedSetting = {
  id?: unknown;
  environment?: unknown;
  provider?: unknown;
  modelName?: unknown;
  url?: unknown;
  apiKey?: unknown;
};

const isFilled = (value: unknown): value is string =>
  typeof value === "string" && value.trim() !== "";

const isHttpsUrl = (value: string): boolean => {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
};

// 호출자가 고른 id와 환경으로만 설정을 찾는다. 활성 설정이나 다른 설정으로 대체하지 않는다
export const createSettingConnectionTester =
  (options: SettingConnectionTesterOptions): SettingConnectionTester =>
  async ({ id, environment }) => {
    let settings: unknown;
    try {
      settings = await options.api.request("/service/resume-model-setting");
    } catch {
      // 원본 오류 메시지에 주소나 토큰이 섞일 수 있어 코드만 전달한다
      return { ok: false, code: "SETTING_UNAVAILABLE" };
    }
    if (!Array.isArray(settings)) {
      return { ok: false, code: "SETTING_UNAVAILABLE" };
    }
    const setting = (settings as ListedSetting[]).find(
      (item) => item.id === id,
    );
    if (!setting) return { ok: false, code: "SETTING_NOT_FOUND" };
    if (setting.environment !== environment) {
      return { ok: false, code: "ENVIRONMENT_MISMATCH" };
    }
    if (typeof setting.apiKey !== "string" || setting.apiKey.trim() === "") {
      return { ok: false, code: "API_KEY_MISSING" };
    }

    const { provider, modelName, url, apiKey } = setting;
    // 키가 평문 http나 잘못된 주소로 나가지 않도록 호출 전에 걸러낸다
    if (
      !isFilled(provider) ||
      !isFilled(modelName) ||
      typeof url !== "string" ||
      !isHttpsUrl(url)
    ) {
      return { ok: false, code: "SETTING_INVALID" };
    }

    return testModelConnection(
      { provider, modelName, url, apiKey },
      {
        connections: options.connections,
        fetchImpl: options.fetchImpl,
        timeoutMs: options.timeoutMs,
      },
    );
  };
