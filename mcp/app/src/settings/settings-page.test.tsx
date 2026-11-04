import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SettingsPage } from "./settings-page";

const jsonResponse = (body: unknown, status = 200) =>
  ({ ok: status < 400, status, json: async () => body }) as Response;

const developmentSetting = {
  id: 11,
  environment: "development",
  provider: "openrouter",
  modelName: "<img src=x onerror=alert(1)>",
  url: "https://openrouter.ai/api/v1/chat/completions",
  hasApiKey: true,
  isActive: true,
};

describe("SettingsPage", () => {
  it("실제 모델 API 키를 입력받아 portfolio-api 저장 요청으로 전달한다", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(jsonResponse({ id: 30 }, 201))
      .mockResolvedValueOnce(jsonResponse([]));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<SettingsPage />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    await user.type(screen.getByLabelText("모델 이름"), "vendor/model");
    const input = screen.getByLabelText("모델 API 키") as HTMLInputElement;
    expect(input.type).toBe("password");
    await user.type(input, "fake-provider-api-key");
    await user.click(screen.getByRole("button", { name: "설정 저장" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    const body = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(body.apiKey).toBe("fake-provider-api-key");
    expect(body).not.toHaveProperty("secretRef");
    expect(
      (screen.getByLabelText("모델 API 키") as HTMLInputElement).value,
    ).toBe("");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("portfolio-api 설정을 환경별로 조회하고 모델 이름을 안전하게 표시한다", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse([developmentSetting]));
    vi.stubGlobal("fetch", fetchMock);

    const { container } = render(<SettingsPage />);

    const development = await screen.findByRole("region", {
      name: "개발 환경",
    });
    expect(
      await within(development).findByText("<img src=x onerror=alert(1)>"),
    ).toBeTruthy();
    expect(within(development).getByText("활성")).toBeTruthy();
    expect(container.querySelector("img")).toBeNull();
    const production = screen.getByRole("region", { name: "운영 환경" });
    expect(
      within(production).getByText("등록된 설정이 없습니다."),
    ).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledWith(
      "/admin/ai-models/api/settings",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it.each(["openrouter", "openai", "gemini"])(
    "%s 비활성 설정을 활성화하고 목록을 다시 조회한다",
    async (provider) => {
      const setting = {
        ...developmentSetting,
        id: 21,
        provider,
        environment: "production",
        modelName: "anthropic/claude-sonnet-5.5",
        hasApiKey: true,
        isActive: false,
      };
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(jsonResponse([setting]))
        .mockResolvedValueOnce(jsonResponse({ id: 21 }))
        .mockResolvedValueOnce(jsonResponse([{ ...setting, isActive: true }]));
      vi.stubGlobal("fetch", fetchMock);
      const user = userEvent.setup();
      render(<SettingsPage />);

      await user.click(await screen.findByRole("button", { name: "활성화" }));

      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
      expect(fetchMock).toHaveBeenNthCalledWith(
        2,
        "/admin/ai-models/api/settings/21/activate",
        expect.objectContaining({ method: "POST" }),
      );
      expect(
        await screen.findByText("현재 환경에서 사용 중인 설정입니다."),
      ).toBeTruthy();
      expect(screen.getByRole("status").textContent).toBe(
        "모델 설정을 활성화했습니다.",
      );
    },
  );

  it("설정 목록을 불러오지 못하면 오류 메시지를 보여준다", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({}, 500)));

    render(<SettingsPage />);

    const status = await screen.findByRole("status");
    expect(status.textContent).toBe(
      "요청을 처리하지 못했습니다. 다시 시도해 주세요.",
    );
    expect(status.className).toContain("text-red-800");
  });

  it.each([
    ["openrouter", "https://openrouter.ai/api/v1/chat/completions"],
    ["openai", "https://api.openai.com/v1/chat/completions"],
    [
      "gemini",
      "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    ],
  ])(
    "%s 설정 저장 폼을 portfolio-api 생성 요청으로 제출한다",
    async (provider, url) => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(jsonResponse([]))
        .mockResolvedValueOnce(jsonResponse({ id: 12 }, 201))
        .mockResolvedValueOnce(jsonResponse([]));
      vi.stubGlobal("fetch", fetchMock);
      const user = userEvent.setup();
      render(<SettingsPage />);
      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

      await user.click(screen.getByRole("button", { name: "환경" }));
      await user.click(screen.getByRole("option", { name: "운영" }));
      await user.click(screen.getByRole("button", { name: "공급자" }));
      await user.click(
        screen.getByRole("option", {
          name: {
            openai: "OpenAI",
            gemini: "Gemini",
            openrouter: "OpenRouter",
          }[provider],
        }),
      );
      await user.type(
        screen.getByLabelText("모델 이름"),
        "anthropic/claude-sonnet-5.5",
      );
      await user.type(
        screen.getByLabelText("모델 API 키"),
        "fake-production-api-key",
      );
      await user.click(screen.getByRole("button", { name: "설정 저장" }));

      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
      expect(fetchMock).toHaveBeenNthCalledWith(
        2,
        "/admin/ai-models/api/settings",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            environment: "production",
            provider,
            modelName: "anthropic/claude-sonnet-5.5",
            url,
            apiKey: "fake-production-api-key",
          }),
        }),
      );
      expect((await screen.findByRole("status")).textContent).toBe(
        "모델 설정을 추가했습니다.",
      );
      expect(
        (screen.getByLabelText("모델 이름") as HTMLInputElement).value,
      ).toBe("");
    },
  );

  it("비활성 설정을 수정 폼에 채우고 변경을 PUT으로 저장한다", async () => {
    const setting = {
      ...developmentSetting,
      modelName: "anthropic/claude-sonnet-5.5",
      isActive: false,
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse([setting]))
      .mockResolvedValueOnce(jsonResponse({ id: 11 }))
      .mockResolvedValueOnce(jsonResponse([]));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<SettingsPage />);

    await user.click(await screen.findByRole("button", { name: "수정" }));

    expect(
      screen.getByRole("heading", { name: "모델 설정 수정" }),
    ).toBeTruthy();
    expect((screen.getByLabelText("모델 이름") as HTMLInputElement).value).toBe(
      "anthropic/claude-sonnet-5.5",
    );
    expect((screen.getByLabelText("환경") as HTMLButtonElement).disabled).toBe(
      true,
    );
    await user.clear(screen.getByLabelText("모델 이름"));
    await user.type(screen.getByLabelText("모델 이름"), "openai/gpt-test");
    await user.click(screen.getByRole("button", { name: "변경 저장" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/admin/ai-models/api/settings/11",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({
          environment: "development",
          provider: "openrouter",
          modelName: "openai/gpt-test",
          url: "https://openrouter.ai/api/v1/chat/completions",
        }),
      }),
    );
    expect((await screen.findByRole("status")).textContent).toBe(
      "모델 설정을 수정했습니다.",
    );
    expect(
      screen.getByRole("heading", { name: "모델 설정 추가" }),
    ).toBeTruthy();
  });

  it("확인하면 비활성 설정을 삭제하고 목록을 다시 조회한다", async () => {
    const setting = {
      ...developmentSetting,
      modelName: "old/model",
      isActive: false,
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse([setting]))
      .mockResolvedValueOnce({ ok: true, status: 204 } as Response)
      .mockResolvedValueOnce(jsonResponse([]));
    vi.stubGlobal("fetch", fetchMock);
    const confirmMock = vi.fn(() => true);
    vi.stubGlobal("confirm", confirmMock);
    const user = userEvent.setup();
    render(<SettingsPage />);

    await user.click(await screen.findByRole("button", { name: "삭제" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    expect(confirmMock).toHaveBeenCalledWith("이 비활성 설정을 삭제할까요?");
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/admin/ai-models/api/settings/11",
      expect.objectContaining({ method: "DELETE" }),
    );
    expect((await screen.findByRole("status")).textContent).toBe(
      "모델 설정을 삭제했습니다.",
    );
  });

  it("삭제 확인을 취소하면 삭제 요청을 보내지 않는다", async () => {
    const setting = { ...developmentSetting, isActive: false };
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse([setting]));
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal(
      "confirm",
      vi.fn(() => false),
    );
    const user = userEvent.setup();
    render(<SettingsPage />);

    await user.click(await screen.findByRole("button", { name: "삭제" }));

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("활성 설정에는 활성화·수정·삭제 버튼을 보이지 않는다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse([developmentSetting])),
    );
    render(<SettingsPage />);

    await screen.findByText("현재 환경에서 사용 중인 설정입니다.");

    expect(screen.queryByRole("button", { name: "활성화" })).toBeNull();
    expect(screen.queryByRole("button", { name: "수정" })).toBeNull();
    expect(screen.queryByRole("button", { name: "삭제" })).toBeNull();
  });

  it("수정 취소를 누르면 추가 폼으로 돌아간다", async () => {
    const setting = { ...developmentSetting, isActive: false };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse([setting])));
    const user = userEvent.setup();
    render(<SettingsPage />);

    await user.click(await screen.findByRole("button", { name: "수정" }));
    await user.click(screen.getByRole("button", { name: "수정 취소" }));

    expect(
      screen.getByRole("heading", { name: "모델 설정 추가" }),
    ).toBeTruthy();
    expect((screen.getByLabelText("환경") as HTMLButtonElement).disabled).toBe(
      false,
    );
  });

  it("제목과 서버로 POST하는 로그아웃 폼을 보여준다", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse([])));
    render(<SettingsPage />);

    expect(
      await screen.findByRole("heading", { level: 1, name: "AI 모델 설정" }),
    ).toBeTruthy();
    const logout = screen.getByRole("button", { name: "로그아웃" });
    const form = logout.closest("form");
    expect(form?.getAttribute("action")).toBe("/admin/ai-models/logout");
    expect(form?.getAttribute("method")).toBe("post");
  });

  it("새로고침을 누르면 설정 목록을 다시 조회한다", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(jsonResponse([developmentSetting]));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<SettingsPage />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    await user.click(screen.getByRole("button", { name: "새로고침" }));

    expect(
      await screen.findByText("<img src=x onerror=alert(1)>"),
    ).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("목록을 불러오는 동안 로딩 문구를 보여주고 빈 상태 문구를 숨긴다", async () => {
    let resolveFetch!: (response: Response) => void;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockReturnValue(
        new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        }),
      ),
    );
    render(<SettingsPage />);

    expect(screen.getAllByText("설정을 불러오는 중입니다.")).toHaveLength(2);
    expect(screen.queryByText("등록된 설정이 없습니다.")).toBeNull();

    resolveFetch(jsonResponse([]));

    expect(await screen.findAllByText("등록된 설정이 없습니다.")).toHaveLength(
      2,
    );
    expect(screen.queryByText("설정을 불러오는 중입니다.")).toBeNull();
  });

  it("수정 중인 설정을 삭제하면 폼이 추가 모드로 돌아간다", async () => {
    const setting = { ...developmentSetting, isActive: false };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse([setting]))
      .mockResolvedValueOnce({ ok: true, status: 204 } as Response)
      .mockResolvedValueOnce(jsonResponse([]));
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal(
      "confirm",
      vi.fn(() => true),
    );
    const user = userEvent.setup();
    render(<SettingsPage />);
    await user.click(await screen.findByRole("button", { name: "수정" }));
    expect(
      screen.getByRole("heading", { name: "모델 설정 수정" }),
    ).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "삭제" }));

    expect(
      await screen.findByRole("heading", { name: "모델 설정 추가" }),
    ).toBeTruthy();
  });

  it("수정 중인 설정을 활성화하면 폼이 추가 모드로 돌아간다", async () => {
    const setting = { ...developmentSetting, isActive: false };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse([setting]))
      .mockResolvedValueOnce(jsonResponse({ id: 11 }))
      .mockResolvedValueOnce(jsonResponse([{ ...setting, isActive: true }]));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<SettingsPage />);
    await user.click(await screen.findByRole("button", { name: "수정" }));
    expect(
      screen.getByRole("heading", { name: "모델 설정 수정" }),
    ).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "활성화" }));

    expect(
      await screen.findByRole("heading", { name: "모델 설정 추가" }),
    ).toBeTruthy();
  });

  describe("연결 테스트", () => {
    const productionSetting = {
      ...developmentSetting,
      id: 21,
      environment: "production",
      modelName: "vendor/prod-model",
      isActive: false,
    };

    it("누른 카드의 id와 환경으로만 테스트하고 결과를 그 카드에만 보여주며 설정은 바꾸지 않는다", async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(
          jsonResponse([developmentSetting, productionSetting]),
        )
        .mockResolvedValueOnce(jsonResponse({ ok: true, latencyMs: 120 }));
      vi.stubGlobal("fetch", fetchMock);
      const user = userEvent.setup();
      render(<SettingsPage />);
      const production = await screen.findByRole("region", {
        name: "운영 환경",
      });

      await user.click(
        within(production).getByRole("button", { name: "연결 테스트" }),
      );

      expect(
        await within(production).findByText("연결 성공 · 120ms"),
      ).toBeTruthy();
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(fetchMock).toHaveBeenLastCalledWith(
        "/admin/ai-models/api/settings/21/test",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ environment: "production" }),
        }),
      );
      const development = screen.getByRole("region", { name: "개발 환경" });
      expect(within(development).queryByRole("status")).toBeNull();
      expect(
        within(production).getByRole("button", { name: "활성화" }),
      ).toBeTruthy();
    });

    it("두 카드를 동시에 테스트해도 결과가 섞이지 않고 진행 중인 카드는 중복 요청을 막는다", async () => {
      let resolveProduction: (response: Response) => void = () => undefined;
      const fetchMock = vi.fn((url: string) => {
        if (url === "/admin/ai-models/api/settings") {
          return Promise.resolve(
            jsonResponse([developmentSetting, productionSetting]),
          );
        }
        if (url.endsWith("/21/test")) {
          return new Promise<Response>((resolve) => {
            resolveProduction = resolve;
          });
        }
        return Promise.resolve(jsonResponse({ ok: true, latencyMs: 80 }));
      });
      vi.stubGlobal("fetch", fetchMock);
      const user = userEvent.setup();
      render(<SettingsPage />);
      const production = await screen.findByRole("region", {
        name: "운영 환경",
      });
      const development = screen.getByRole("region", { name: "개발 환경" });

      await user.click(
        within(production).getByRole("button", { name: "연결 테스트" }),
      );
      await user.click(
        within(development).getByRole("button", { name: "연결 테스트" }),
      );

      expect(
        await within(development).findByText("연결 성공 · 80ms"),
      ).toBeTruthy();
      expect(
        within(production).getByText("연결을 테스트하는 중입니다."),
      ).toBeTruthy();
      const running = within(production).getByRole("button", {
        name: "테스트 중...",
      }) as HTMLButtonElement;
      expect(running.disabled).toBe(true);
      await user.click(running);
      expect(
        fetchMock.mock.calls.filter(([url]) => url.endsWith("/21/test")),
      ).toHaveLength(1);

      resolveProduction(jsonResponse({ ok: false, code: "MODEL_REJECTED" }));

      expect(
        await within(production).findByText(
          /^연결 실패 · 모델 공급자가 요청을 거부했습니다/,
        ),
      ).toBeTruthy();
      expect(within(development).getByText("연결 성공 · 80ms")).toBeTruthy();
    });

    it("요청이 실패하면 서버 메시지 없이 안내를 보여주고 다시 테스트할 수 있다", async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(jsonResponse([productionSetting]))
        .mockResolvedValueOnce(jsonResponse({ message: "secret detail" }, 500));
      vi.stubGlobal("fetch", fetchMock);
      const user = userEvent.setup();
      render(<SettingsPage />);
      const production = await screen.findByRole("region", {
        name: "운영 환경",
      });

      await user.click(
        within(production).getByRole("button", { name: "연결 테스트" }),
      );

      expect(
        await within(production).findByText(
          "연결 실패 · 요청을 처리하지 못했습니다. 다시 시도해 주세요.",
        ),
      ).toBeTruthy();
      expect(production.textContent).not.toContain("secret detail");
      expect(
        (
          within(production).getByRole("button", {
            name: "연결 테스트",
          }) as HTMLButtonElement
        ).disabled,
      ).toBe(false);
    });
  });
});
