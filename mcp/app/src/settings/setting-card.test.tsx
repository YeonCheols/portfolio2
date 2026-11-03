import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { ConnectionTestState, ModelSetting } from "../types";
import { SettingCard } from "./setting-card";

const baseSetting: ModelSetting = {
  id: 1,
  environment: "development",
  provider: "openrouter",
  modelName: "vendor/model",
  url: "https://openrouter.ai/api/v1/chat/completions",
  hasApiKey: true,
  isActive: false,
};

const renderCard = (
  setting: ModelSetting,
  props: { testState?: ConnectionTestState; onTest?: () => void } = {},
) =>
  render(
    <SettingCard
      setting={setting}
      testState={props.testState}
      onTest={props.onTest ?? vi.fn()}
      onActivate={vi.fn()}
      onEdit={vi.fn()}
      onDelete={vi.fn()}
    />,
  );

describe("SettingCard", () => {
  it("키가 없는 설정은 등록 안내를 보여주고 활성화를 막는다", () => {
    renderCard({ ...baseSetting, hasApiKey: false });
    expect(screen.getByText("API 키: 미등록")).toBeTruthy();
    expect(
      (screen.getByRole("button", { name: "활성화" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });

  it("활성 설정과 비활성 설정 모두 연결 테스트를 누르면 해당 설정을 전달한다", async () => {
    const user = userEvent.setup();

    for (const isActive of [false, true]) {
      const onTest = vi.fn();
      const setting = { ...baseSetting, isActive };
      const { unmount } = renderCard(setting, { onTest });

      await user.click(screen.getByRole("button", { name: "연결 테스트" }));

      expect(onTest).toHaveBeenCalledTimes(1);
      expect(onTest).toHaveBeenCalledWith(setting);
      unmount();
    }
  });

  it("테스트 중에는 버튼을 막아 중복 요청을 방지하고 진행 안내를 보여준다", () => {
    renderCard(baseSetting, { testState: { status: "running" } });

    const button = screen.getByRole("button", {
      name: "테스트 중...",
    }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(screen.getByRole("status").textContent).toBe(
      "연결을 테스트하는 중입니다.",
    );
  });

  it("실패하면 코드를 그대로 노출하지 않고 원인별 안내를 보여준다", () => {
    const expected: Record<string, string> = {
      API_KEY_MISSING: "API 키가 등록되지 않았습니다.",
      MODEL_REJECTED:
        "모델 공급자가 요청을 거부했습니다. 키와 모델 이름을 확인해 주세요.",
      MODEL_TIMEOUT: "제한 시간 안에 응답이 없습니다.",
      MODEL_UNAVAILABLE: "모델 공급자에 연결하지 못했습니다.",
      MISSING_MODEL_CONNECTION: "지원하지 않는 공급자입니다.",
      SETTING_INVALID: "설정의 주소나 모델 정보가 올바르지 않습니다.",
      SETTING_NOT_FOUND: "설정을 찾을 수 없습니다. 새로고침해 주세요.",
      ENVIRONMENT_MISMATCH: "설정의 환경이 달라졌습니다. 새로고침해 주세요.",
      SETTING_UNAVAILABLE:
        "설정을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
      REQUEST_FAILED: "요청을 처리하지 못했습니다. 다시 시도해 주세요.",
    };

    for (const [code, message] of Object.entries(expected)) {
      const { unmount } = renderCard(baseSetting, {
        testState: { status: "done", result: { ok: false, code } },
      });

      const text = screen.getByRole("status").textContent ?? "";
      expect(text).toBe(`연결 실패 · ${message}`);
      expect(text).not.toContain(code);
      unmount();
    }
  });

  it("알 수 없는 실패 코드는 일반 문구로 보여주고 코드를 노출하지 않는다", () => {
    renderCard(baseSetting, {
      testState: {
        status: "done",
        result: { ok: false, code: "SOMETHING_ELSE" },
      },
    });

    const text = screen.getByRole("status").textContent ?? "";
    expect(text).toBe("연결 실패 · 연결에 실패했습니다.");
    expect(text).not.toContain("SOMETHING_ELSE");
  });

  it("prototype 이름과 같은 코드가 와도 일반 문구로 처리하고 함수 원문을 그리지 않는다", () => {
    for (const code of [
      "constructor",
      "toString",
      "__proto__",
      "hasOwnProperty",
    ]) {
      const { unmount } = renderCard(baseSetting, {
        testState: {
          status: "done",
          result: { ok: true, latencyMs: 1, structured: { ok: false, code } },
        },
      });

      expect(
        screen.getByText("구조화 응답 미지원 · 연결에 실패했습니다."),
      ).toBeTruthy();
      unmount();
    }
  });

  it("구조화 응답을 지원하면 연결 성공과 따로 소요 시간을 보여준다", () => {
    renderCard(baseSetting, {
      testState: {
        status: "done",
        result: {
          ok: true,
          latencyMs: 120,
          structured: { ok: true, latencyMs: 600 },
        },
      },
    });

    expect(screen.getByRole("status").textContent).toBe("연결 성공 · 120ms");
    expect(screen.getByText("구조화 응답 지원 · 600ms")).toBeTruthy();
  });

  it("구조화 응답이 안 되어도 연결 성공은 유지하고 원인을 보여준다", () => {
    const cases: Array<[string, string]> = [
      [
        "MODEL_REJECTED",
        "구조화 응답 미지원 · 모델 공급자가 요청을 거부했습니다. 키와 모델 이름을 확인해 주세요.",
      ],
      [
        "STRUCTURED_INVALID",
        "구조화 응답 형식 오류 · 모델이 약속한 JSON으로 답하지 않았습니다.",
      ],
      ["SOMETHING_ELSE", "구조화 응답 미지원 · 연결에 실패했습니다."],
    ];

    for (const [code, message] of cases) {
      const { unmount } = renderCard(baseSetting, {
        testState: {
          status: "done",
          result: {
            ok: true,
            latencyMs: 120,
            structured: { ok: false, code },
          },
        },
      });

      expect(screen.getByRole("status").textContent).toBe("연결 성공 · 120ms");
      const line = screen.getByText(message);
      expect(line).toBeTruthy();
      expect(line.textContent).not.toContain(code);
      unmount();
    }
  });

  it("공급자 응답 원문을 접어서 보여주고 일반·구조화 응답을 구분한다", () => {
    const { container } = renderCard(baseSetting, {
      testState: {
        status: "done",
        result: {
          ok: true,
          latencyMs: 120,
          response: { id: "gen-basic", note: "<img src=x onerror=alert(1)>" },
          structured: {
            ok: true,
            latencyMs: 600,
            response: { id: "gen-structured" },
          },
        },
      },
    });

    const details = container.querySelector("details");
    expect(details).not.toBeNull();
    expect(details!.open).toBe(false);
    expect(screen.getByText("응답 원문 보기")).toBeTruthy();
    const blocks = Array.from(container.querySelectorAll("details pre")).map(
      (pre) => pre.textContent ?? "",
    );
    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toContain('"id": "gen-basic"');
    expect(blocks[1]).toContain('"id": "gen-structured"');
    expect(screen.getByText("일반 응답")).toBeTruthy();
    expect(screen.getByText("구조화 응답")).toBeTruthy();
    expect(container.querySelector("img")).toBeNull();
  });

  it("응답 원문이 없거나 실패한 결과에는 원문 영역을 만들지 않는다", () => {
    const results = [
      { ok: true as const, latencyMs: 120 },
      { ok: false as const, code: "MODEL_REJECTED" },
    ];

    for (const result of results) {
      const { container, unmount } = renderCard(baseSetting, {
        testState: { status: "done", result },
      });

      expect(container.querySelector("details")).toBeNull();
      unmount();
    }
  });

  it("성공하면 소요 시간을 보여주고 다시 테스트할 수 있다", () => {
    renderCard(baseSetting, {
      testState: { status: "done", result: { ok: true, latencyMs: 120 } },
    });

    expect(screen.getByRole("status").textContent).toBe("연결 성공 · 120ms");
    expect(
      (screen.getByRole("button", { name: "연결 테스트" }) as HTMLButtonElement)
        .disabled,
    ).toBe(false);
  });
});
