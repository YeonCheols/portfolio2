import type { ModelSetting, ModelSettingInput } from "../types";

const settingsUrl = "/admin/ai-models/api/settings";

const request = async (path: string, init: RequestInit): Promise<unknown> => {
  const response = await fetch(path, { credentials: "same-origin", ...init });
  if (response.status === 401) {
    window.location.assign(
      new URL("/admin/ai-models/connect", window.location.origin).toString(),
    );
    throw new Error("세션이 만료되었습니다. 다시 로그인해 주세요.");
  }
  if (!response.ok) {
    throw new Error("요청을 처리하지 못했습니다. 다시 시도해 주세요.");
  }
  if (response.status === 204) return null;
  return response.json();
};

export const listSettings = async (): Promise<ModelSetting[]> => {
  const settings = await request(settingsUrl, { method: "GET" });
  if (!Array.isArray(settings)) {
    throw new Error("설정 목록 형식이 올바르지 않습니다.");
  }
  return settings as ModelSetting[];
};

const jsonInit = (method: string, input: ModelSettingInput): RequestInit => ({
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
