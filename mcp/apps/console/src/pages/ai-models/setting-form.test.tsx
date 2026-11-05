import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { ModelSettingInput } from "../../types";
import { SettingForm } from "./setting-form";

const setting = {
  id: 1,
  environment: "development" as const,
  provider: "openrouter",
  modelName: "vendor/model",
  url: "https://openrouter.ai/api/v1/chat/completions",
  hasApiKey: true,
  isActive: false,
};
describe("SettingForm", () => {
  it("공급자를 바꾸면 모델 예시와 공식 목록 링크를 바꾸고 입력한 모델 이름은 유지한다", async () => {
    const onSubmit = vi
      .fn<(input: ModelSettingInput) => Promise<boolean>>()
      .mockResolvedValue(false);
    render(
      <SettingForm editing={setting} onCancel={vi.fn()} onSubmit={onSubmit} />,
    );
    const user = userEvent.setup();
    const model = screen.getByRole("textbox", {
      name: "모델 이름",
    }) as HTMLInputElement;
    expect(model.placeholder).toBe("예: openai/gpt-4.1");
    expect(
      screen
        .getByRole("link", { name: /OpenRouter 모델 목록/ })
        .getAttribute("href"),
    ).toBe("https://openrouter.ai/models");
    await user.clear(model);
    await user.type(model, "my-custom-model");
    for (const [label, example, href] of [
      ["OpenAI", "gpt-4.1", "https://developers.openai.com/api/docs/models"],
      [
        "Gemini",
        "gemini-3.8-flash",
        "https://ai.google.dev/gemini-api/docs/models",
      ],
      ["OpenRouter", "openai/gpt-4.1", "https://openrouter.ai/models"],
    ]) {
      await user.click(screen.getByRole("button", { name: "공급자" }));
      await user.click(screen.getByRole("option", { name: label }));
      expect(model.placeholder).toBe(`예: ${example}`);
      expect(model.value).toBe("my-custom-model");
      const link = screen.getByRole("link", {
        name: `${label} 모델 목록 (새 창)`,
      });
      expect(link.getAttribute("href")).toBe(href);
      expect(link.getAttribute("target")).toBe("_blank");
      expect(link.getAttribute("rel")).toContain("noopener");
      expect(model.getAttribute("aria-describedby")).toBe("setting-model-help");
      expect(
        document.getElementById("setting-model-help")?.textContent,
      ).toContain(example);
    }
    await user.click(screen.getByRole("button", { name: "변경 저장" }));
    expect(onSubmit).toHaveBeenLastCalledWith(
      expect.objectContaining({ modelName: "my-custom-model" }),
    );
  });
  it("키보드로 공급자를 선택하면 기본 주소를 갱신하고 폼을 제출하지 않는다", async () => {
    const onSubmit = vi
      .fn<(input: ModelSettingInput) => Promise<boolean>>()
      .mockResolvedValue(false);
    render(
      <SettingForm editing={null} onCancel={vi.fn()} onSubmit={onSubmit} />,
    );
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /공급자/ }));
    expect(screen.getByRole("listbox")).toBeTruthy();
    await user.keyboard("{ArrowDown}{Enter}");
    expect(
      screen.getByRole("button", { name: /공급자/ }).textContent,
    ).toContain("OpenAI");
    expect((screen.getByLabelText("API 주소") as HTMLInputElement).value).toBe(
      "https://api.openai.com/v1/chat/completions",
    );
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(onSubmit).not.toHaveBeenCalled();
  });
  it("공급자를 선택하면 기본 주소를 바꾸고 해당 공급자로 저장한다", async () => {
    const onSubmit = vi
      .fn<(input: ModelSettingInput) => Promise<boolean>>()
      .mockResolvedValue(false);
    render(
      <SettingForm editing={setting} onCancel={vi.fn()} onSubmit={onSubmit} />,
    );
    const user = userEvent.setup();
    expect(onSubmit).not.toHaveBeenCalled();
    for (const [provider, url] of [
      ["openai", "https://api.openai.com/v1/chat/completions"],
      [
        "gemini",
        "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
      ],
      ["openrouter", setting.url],
    ]) {
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
      expect(
        (screen.getByLabelText("API 주소") as HTMLInputElement).value,
      ).toBe(url);
      expect(onSubmit).toHaveBeenCalledTimes(
        provider === "openai" ? 0 : provider === "gemini" ? 1 : 2,
      );
      await user.click(screen.getByRole("button", { name: "변경 저장" }));
      expect(onSubmit).toHaveBeenLastCalledWith({
        environment: "development",
        provider,
        modelName: setting.modelName,
        url,
      });
    }
  });
  it("수정 폼의 키는 비워두며 생략하면 기존 키 유지를 요청한다", async () => {
    const onSubmit = vi
      .fn<(input: ModelSettingInput) => Promise<boolean>>()
      .mockResolvedValue(false);
    render(
      <SettingForm editing={setting} onCancel={vi.fn()} onSubmit={onSubmit} />,
    );
    const key = screen.getByLabelText("모델 API 키") as HTMLInputElement;
    expect(key.value).toBe("");
    expect(key.type).toBe("password");
    expect(key.required).toBe(false);
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "변경 저장" }));
    expect(onSubmit).toHaveBeenCalledWith({
      environment: "development",
      provider: "openrouter",
      modelName: "vendor/model",
      url: setting.url,
    });
  });
  it("비활성 설정의 키를 입력하면 새 키로 교체를 요청한다", async () => {
    const onSubmit = vi
      .fn<(input: ModelSettingInput) => Promise<boolean>>()
      .mockResolvedValue(false);
    render(
      <SettingForm editing={setting} onCancel={vi.fn()} onSubmit={onSubmit} />,
    );
    const user = userEvent.setup();
    await user.type(
      screen.getByLabelText("모델 API 키"),
      "fake-replacement-key",
    );
    await user.click(screen.getByRole("button", { name: "변경 저장" }));
    expect(onSubmit.mock.calls[0][0]).toEqual(
      expect.objectContaining({ apiKey: "fake-replacement-key" }),
    );
  });
});
