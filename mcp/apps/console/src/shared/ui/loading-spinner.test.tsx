import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LoadingSpinner } from "./loading-spinner";

describe("LoadingSpinner", () => {
  it("문구는 보조 기술에만 알리고 동그란 표시는 화면 읽기에서 숨긴다", () => {
    render(<LoadingSpinner label="목록을 불러오는 중입니다." />);

    const status = screen.getByRole("status");
    expect(status.getAttribute("aria-live")).toBe("polite");
    expect(screen.getByText("목록을 불러오는 중입니다.").className).toContain(
      "sr-only",
    );
    const ring = status.querySelector('[aria-hidden="true"]');
    expect(ring?.className).toContain("rounded-full");
    expect(ring?.className).toContain("animate-spin");
  });

  it("움직임을 줄이도록 설정한 사용자에게는 회전을 끈다", () => {
    render(<LoadingSpinner label="불러오는 중입니다." />);

    expect(
      screen.getByRole("status").querySelector('[aria-hidden="true"]')
        ?.className,
    ).toContain("motion-reduce:animate-none");
  });

  it("받은 클래스를 바깥 요소에 붙인다", () => {
    render(<LoadingSpinner label="불러오는 중입니다." className="mt-4" />);

    expect(screen.getByTestId("loading-spinner").className).toBe("mt-4");
  });
});
