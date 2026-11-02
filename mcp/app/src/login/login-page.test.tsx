import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LoginPage } from "./login-page";

describe("LoginPage", () => {
  it("GitHub 로그인 버튼이 서버의 OAuth 시작 경로로 POST한다", () => {
    render(<LoginPage error={null} />);

    expect(
      screen.getByRole("heading", { level: 1, name: "AI 모델 설정 로그인" }),
    ).toBeTruthy();
    const form = screen
      .getByRole("button", { name: "GitHub로 로그인" })
      .closest("form");
    expect(form?.getAttribute("action")).toBe("/admin/ai-models/oauth/start");
    expect(form?.getAttribute("method")).toBe("post");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("로그인에 실패해 돌아오면 안내 문구를 알림으로 보여준다", () => {
    render(<LoginPage error="login_failed" />);

    expect(screen.getByRole("alert").textContent).toBe(
      "로그인에 실패했습니다. 계정 정보를 확인해 주세요.",
    );
  });
});
