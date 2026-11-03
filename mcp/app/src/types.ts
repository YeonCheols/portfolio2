export type ModelEnvironment = "development" | "production";

export type ModelSetting = {
  id: number;
  environment: ModelEnvironment;
  provider: string;
  modelName: string;
  url: string;
  hasApiKey: boolean;
  isActive: boolean;
};

// json_schema 응답 형식을 쓸 수 있는지 확인한 결과다. 지원하지 않거나 형식이 틀리면 코드가 온다
export type StructuredCheck =
  | { ok: true; latencyMs: number; response?: unknown }
  | { ok: false; code: string; response?: unknown };

// 서버는 성공 여부와 소요 시간, 공급자 응답 원문, 구조화 응답 확인 결과 또는 안전한 오류 코드만 돌려준다
export type ConnectionTestResult =
  | {
      ok: true;
      latencyMs: number;
      response?: unknown;
      structured?: StructuredCheck;
    }
  | { ok: false; code: string };

export type ConnectionTestState =
  | { status: "running" }
  | { status: "done"; result: ConnectionTestResult };

export type ModelSettingInput = Pick<
  ModelSetting,
  "environment" | "provider" | "modelName" | "url"
> & { apiKey?: string };
