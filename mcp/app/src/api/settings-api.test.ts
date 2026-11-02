import { afterEach, describe, expect, it, vi } from "vitest";

import {
  activateSetting,
  createSetting,
  deleteSetting,
  listSettings,
  updateSetting,
} from "./settings-api";

const jsonResponse = (body: unknown, status = 200) =>
  ({ ok: status < 400, status, json: async () => body }) as Response;

describe("settingsApi", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("설정 목록을 같은 출처 세션으로 조회한다", async () => {
    const setting = {
      id: 11,
      environment: "development",
      provider: "openrouter",
      modelName: "anthropic/claude-sonnet-5.5",
      url: "https://openrouter.ai/api/v1/chat/completions",
      secretRef: "RESUME_MODEL_TOKEN_DEV",
      isActive: true,
    };
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse([setting]));
    vi.stubGlobal("fetch", fetchMock);

    const settings = await listSettings();

    expect(fetchMock).toHaveBeenCalledWith(
      "/admin/ai-models/api/settings",
      expect.objectContaining({ method: "GET", credentials: "same-origin" }),
    );
    expect(settings).toEqual([setting]);
  });

  it("목록 응답이 배열이 아니면 형식 오류로 던진다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ items: [] })),
    );

    await expect(listSettings()).rejects.toThrow(
      "설정 목록 형식이 올바르지 않습니다.",
    );
  });

  it("서버가 오류를 반환하면 응답 본문 없이 안내 문구로 던진다", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(jsonResponse({ message: "secret detail" }, 500)),
    );

    await expect(listSettings()).rejects.toThrow(
      "요청을 처리하지 못했습니다. 다시 시도해 주세요.",
    );
  });

  it("세션이 만료되면 로그인 화면으로 이동하고 오류를 던진다", async () => {
    const assign = vi.fn();
    vi.stubGlobal("location", {
      origin: "http://localhost:8080",
      assign,
    });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({}, 401)));

    await expect(listSettings()).rejects.toThrow(
      "세션이 만료되었습니다. 다시 로그인해 주세요.",
    );
    expect(assign).toHaveBeenCalledWith(
      "http://localhost:8080/admin/ai-models/connect",
    );
  });

  it("설정을 추가할 때 JSON 본문을 POST로 보낸다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ id: 12 }, 201));
    vi.stubGlobal("fetch", fetchMock);
    const input = {
      environment: "production",
      provider: "openrouter",
      modelName: "anthropic/claude-sonnet-5.5",
      url: "https://openrouter.ai/api/v1/chat/completions",
      secretRef: "RESUME_MODEL_TOKEN_PRODUCTION",
    } as const;

    await createSetting(input);

    expect(fetchMock).toHaveBeenCalledWith(
      "/admin/ai-models/api/settings",
      expect.objectContaining({
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      }),
    );
  });

  it("설정을 수정할 때 id 경로로 JSON 본문을 PUT으로 보낸다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ id: 11 }));
    vi.stubGlobal("fetch", fetchMock);
    const input = {
      environment: "development",
      provider: "openrouter",
      modelName: "openai/gpt-test",
      url: "https://openrouter.ai/api/v1/chat/completions",
      secretRef: "RESUME_MODEL_TOKEN_DEV",
    } as const;

    await updateSetting(11, input);

    expect(fetchMock).toHaveBeenCalledWith(
      "/admin/ai-models/api/settings/11",
      expect.objectContaining({
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      }),
    );
  });

  it("설정을 삭제할 때 id 경로로 DELETE를 보내고 204 본문은 읽지 않는다", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
      json: async () => {
        throw new Error("204 응답은 본문이 없습니다");
      },
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(deleteSetting(11)).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenCalledWith(
      "/admin/ai-models/api/settings/11",
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("설정을 활성화할 때 activate 경로로 POST를 보낸다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ id: 11 }));
    vi.stubGlobal("fetch", fetchMock);

    await activateSetting(11);

    expect(fetchMock).toHaveBeenCalledWith(
      "/admin/ai-models/api/settings/11/activate",
      expect.objectContaining({ method: "POST" }),
    );
  });
});
