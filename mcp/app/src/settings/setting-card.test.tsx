import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SettingCard } from "./setting-card";

describe("SettingCard", () => {
  it("키가 없는 설정은 등록 안내를 보여주고 활성화를 막는다", () => {
    const setting = {
      id: 1,
      environment: "development" as const,
      provider: "openrouter",
      modelName: "vendor/model",
      url: "https://openrouter.ai/api/v1/chat/completions",
      hasApiKey: false,
      isActive: false,
    };
    render(
      <SettingCard
        setting={setting}
        onActivate={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByText("API 키: 미등록")).toBeTruthy();
    expect(
      (screen.getByRole("button", { name: "활성화" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });
});
