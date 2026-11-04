import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { NavigationProgress } from "./navigation-progress";

const message = "페이지를 이동하는 중입니다.";

describe("NavigationProgress", () => {
  beforeEach(() => {
    // jsdom은 실제 이동을 구현하지 않아 클릭 때 오류를 출력하므로 조용히 둔다
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const setup = () =>
    render(
      <>
        <NavigationProgress />
        <a href="/admin/debug/resume">같은 출처</a>
        <a href="/admin/debug/resume" target="_blank">
          새 탭
        </a>
        <a href="https://example.com/">외부</a>
        <a href="#section">같은 문서 앵커</a>
        <a href="data:application/pdf;base64,JVBERi0=" download="a.pdf">
          내려받기
        </a>
        <form action="/admin/ai-models/logout" method="post">
          <button type="submit">제출</button>
        </form>
      </>,
    );

  it("같은 출처 링크를 누르면 이동 중임을 알리고 평소에는 아무것도 보이지 않는다", () => {
    setup();
    expect(screen.queryByRole("status")).toBeNull();

    fireEvent.click(screen.getByRole("link", { name: "같은 출처" }));

    expect(screen.getByRole("status").textContent).toContain(message);
  });

  it("새 탭·외부·앵커·내려받기·보조키 클릭은 이동으로 보지 않는다", () => {
    setup();

    fireEvent.click(screen.getByRole("link", { name: "새 탭" }));
    fireEvent.click(screen.getByRole("link", { name: "외부" }));
    fireEvent.click(screen.getByRole("link", { name: "같은 문서 앵커" }));
    fireEvent.click(screen.getByRole("link", { name: "내려받기" }));
    fireEvent.click(screen.getByRole("link", { name: "같은 출처" }), {
      ctrlKey: true,
    });
    fireEvent.click(screen.getByRole("link", { name: "같은 출처" }), {
      metaKey: true,
    });
    fireEvent.click(screen.getByRole("link", { name: "같은 출처" }), {
      button: 1,
    });

    expect(screen.queryByRole("status")).toBeNull();
  });

  it("폼 제출도 이동으로 보고 뒤로 가기로 되살아난 화면에서는 표시를 지운다", () => {
    setup();

    fireEvent.submit(
      screen.getByRole("button", { name: "제출" }).closest("form")!,
    );
    expect(screen.getByRole("status")).toBeTruthy();

    act(() => {
      window.dispatchEvent(
        Object.assign(new Event("pageshow"), { persisted: true }),
      );
    });
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("이동이 끝나지 않아도 일정 시간 뒤에는 표시를 거두어 화면을 가리지 않는다", () => {
    vi.useFakeTimers();
    try {
      setup();
      fireEvent.click(screen.getByRole("link", { name: "같은 출처" }));
      expect(screen.getByRole("status")).toBeTruthy();

      act(() => {
        vi.advanceTimersByTime(20_000);
      });
      expect(screen.queryByRole("status")).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});
