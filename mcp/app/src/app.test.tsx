import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { App } from "./app";

describe("App", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("connect 경로는 로그인 화면을 보여주고 error 쿼리를 전달한다", () => {
    render(
      <App pathname="/admin/ai-models/connect" search="?error=login_failed" />,
    );

    expect(
      screen.getByRole("heading", { level: 1, name: "AI 모델 설정 로그인" }),
    ).toBeTruthy();
    expect(screen.getByRole("alert")).toBeTruthy();
  });
});
