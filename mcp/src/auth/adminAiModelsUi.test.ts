import { readFileSync } from "fs";
import { join } from "path";

import { fireEvent, screen, waitFor } from "@testing-library/dom";

import { renderAdminPage } from "@mcp/auth/adminPages";

describe("MCP AI 모델 설정 화면", () => {
  beforeEach(() => {
    const html = renderAdminPage();
    document.body.innerHTML =
      html.match(/<body[^>]*>([\s\S]*)<\/body>/)?.[1] ?? "";
  });

  it("portfolio-api 설정을 환경별로 조회하고 모델 이름을 안전하게 표시한다", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [
        {
          id: 11,
          environment: "development",
          provider: "openrouter",
          modelName: "<img src=x onerror=alert(1)>",
          url: "https://openrouter.ai/api/v1/chat/completions",
          secretRef: "RESUME_MODEL_TOKEN_DEV",
          isActive: true,
          createdAt: "2026-11-01T00:00:00.000Z",
          updatedAt: "2026-11-01T00:00:00.000Z",
        },
      ],
    });
    Object.defineProperty(window, "fetch", {
      configurable: true,
      value: fetchMock,
    });
    const script = readFileSync(
      join(process.cwd(), "mcp/src/auth/pages/admin-ai-models.js"),
      "utf8",
    );

    window.eval(script);

    await waitFor(() => {
      expect(
        document.querySelector('[data-settings-list="development"]')
          ?.textContent,
      ).toContain("<img src=x onerror=alert(1)>");
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/admin/ai-models/api/settings",
      expect.objectContaining({ method: "GET" }),
    );
    expect(document.querySelector("[data-settings-list] img")).toBeNull();
    expect(
      document.querySelector('[data-settings-list="development"]')?.textContent,
    ).toContain("활성");
  });

  it("모델 설정 저장 폼을 portfolio-api 생성 요청으로 제출한다", async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => [] })
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({ id: 12 }),
      })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => [] });
    Object.defineProperty(window, "fetch", {
      configurable: true,
      value: fetchMock,
    });
    const script = readFileSync(
      join(process.cwd(), "mcp/src/auth/pages/admin-ai-models.js"),
      "utf8",
    );
    window.eval(script);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    (document.querySelector("#environment") as HTMLSelectElement).value =
      "production";
    (document.querySelector("#provider") as HTMLSelectElement).value =
      "openrouter";
    (document.querySelector("#model-name") as HTMLInputElement).value =
      "anthropic/claude-sonnet-5.5";
    (document.querySelector("#model-url") as HTMLInputElement).value =
      "https://openrouter.ai/api/v1/chat/completions";
    (document.querySelector("#secret-ref") as HTMLInputElement).value =
      "RESUME_MODEL_TOKEN_PRODUCTION";
    fireEvent.submit(
      document.querySelector("#setting-form") as HTMLFormElement,
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/admin/ai-models/api/settings",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          environment: "production",
          provider: "openrouter",
          modelName: "anthropic/claude-sonnet-5.5",
          url: "https://openrouter.ai/api/v1/chat/completions",
          secretRef: "RESUME_MODEL_TOKEN_PRODUCTION",
        }),
      }),
    );
  });

  it("비활성 설정을 수정하고 삭제한다", async () => {
    const setting = {
      id: 11,
      environment: "development",
      provider: "openrouter",
      modelName: "anthropic/claude-sonnet-5.5",
      url: "https://openrouter.ai/api/v1/chat/completions",
      secretRef: "RESUME_MODEL_TOKEN_DEV",
      isActive: false,
    };
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [setting],
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [setting],
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => setting,
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [setting],
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => setting,
      })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => [] });
    Object.defineProperty(window, "fetch", {
      configurable: true,
      value: fetchMock,
    });
    Object.defineProperty(window, "confirm", {
      configurable: true,
      value: jest.fn(() => true),
    });
    const script = readFileSync(
      join(process.cwd(), "mcp/src/auth/pages/admin-ai-models.js"),
      "utf8",
    );
    window.eval(script);

    await screen.findByRole("button", { name: "수정" });
    fireEvent.click(screen.getByRole("button", { name: "수정" }));
    await waitFor(() =>
      expect(
        (document.querySelector("#model-name") as HTMLInputElement).value,
      ).toBe(setting.modelName),
    );
    (document.querySelector("#model-name") as HTMLInputElement).value =
      "openai/gpt-test";
    fireEvent.submit(
      document.querySelector("#setting-form") as HTMLFormElement,
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(4));
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "/admin/ai-models/api/settings/11",
      expect.objectContaining({ method: "PUT" }),
    );
    fireEvent.click(await screen.findByRole("button", { name: "삭제" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(6));
    expect(fetchMock).toHaveBeenNthCalledWith(
      5,
      "/admin/ai-models/api/settings/11",
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("비활성 설정을 활성화하고 목록을 다시 조회한다", async () => {
    const setting = {
      id: 11,
      environment: "production",
      provider: "openrouter",
      modelName: "anthropic/claude-sonnet-5.5",
      url: "https://openrouter.ai/api/v1/chat/completions",
      secretRef: "RESUME_MODEL_TOKEN_PRODUCTION",
      isActive: false,
    };
    const activeSetting = { ...setting, isActive: true };
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [setting],
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => activeSetting,
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [activeSetting],
      });
    Object.defineProperty(window, "fetch", {
      configurable: true,
      value: fetchMock,
    });
    const script = readFileSync(
      join(process.cwd(), "mcp/src/auth/pages/admin-ai-models.js"),
      "utf8",
    );
    window.eval(script);

    fireEvent.click(await screen.findByRole("button", { name: "활성화" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/admin/ai-models/api/settings/11/activate",
      expect.objectContaining({ method: "POST" }),
    );
    expect(
      await screen.findByText("현재 환경에서 사용 중인 설정입니다."),
    ).toBeTruthy();
  });
});
