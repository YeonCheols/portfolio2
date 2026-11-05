import type {
  ConnectionTestResult,
  ModelEnvironment,
  ModelSetting,
  ModelSettingInput,
  StructuredCheck,
} from "../../../types";

import { request } from "../../../shared/api/request";

const settingsUrl = "/admin/ai-models/api/settings";

export const listSettings = async (): Promise<ModelSetting[]> => {
  const settings = await request(settingsUrl, { method: "GET" });
  if (!Array.isArray(settings)) {
    throw new Error("설정 목록 형식이 올바르지 않습니다.");
  }
  return settings as ModelSetting[];
};

const jsonInit = (method: string, input: unknown): RequestInit => ({
  method,
  headers: { "content-type": "application/json" },
  body: JSON.stringify(input),
});

export const createSetting = async (
  input: ModelSettingInput,
): Promise<void> => {
  await request(settingsUrl, jsonInit("POST", input));
};

export const updateSetting = async (
  id: number,
  input: ModelSettingInput,
): Promise<void> => {
  await request(`${settingsUrl}/${id}`, jsonInit("PUT", input));
};

export const deleteSetting = async (id: number): Promise<void> => {
  await request(`${settingsUrl}/${id}`, { method: "DELETE" });
};

export const activateSetting = async (id: number): Promise<void> => {
  await request(`${settingsUrl}/${id}/activate`, { method: "POST" });
};

const isStructuredCheck = (value: unknown): value is StructuredCheck => {
  if (typeof value !== "object" || value === null) return false;
  const check = value as Record<string, unknown>;
  if (check.ok === true) return typeof check.latencyMs === "number";
  return check.ok === false && typeof check.code === "string";
};

const isConnectionTestResult = (
  value: unknown,
): value is ConnectionTestResult => {
  if (typeof value !== "object" || value === null) return false;
  const result = value as Record<string, unknown>;
  if (result.ok === true) {
    return (
      typeof result.latencyMs === "number" &&
      (result.structured === undefined || isStructuredCheck(result.structured))
    );
  }
  return result.ok === false && typeof result.code === "string";
};

export const testSetting = async (
  id: number,
  environment: ModelEnvironment,
): Promise<ConnectionTestResult> => {
  const result = await request(
    `${settingsUrl}/${id}/test`,
    jsonInit("POST", { environment }),
  );
  if (!isConnectionTestResult(result)) {
    throw new Error("연결 테스트 응답 형식이 올바르지 않습니다.");
  }
  return result;
};
