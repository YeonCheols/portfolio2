import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { ModelSettingInput } from "../types";
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
