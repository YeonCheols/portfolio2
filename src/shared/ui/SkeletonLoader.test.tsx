import { render, screen } from "@testing-library/react";
import { useTheme } from "next-themes";
import Skeleton from "react-loading-skeleton";

import SkeletonLoader from "@/shared/ui/SkeletonLoader";

jest.mock("next-themes", () => ({
  useTheme: jest.fn(),
}));

const mockedUseTheme = useTheme as jest.Mock;

const baseColor = (container: HTMLElement) => {
  const bar = container.querySelector(".react-loading-skeleton");
  if (!(bar instanceof HTMLElement)) {
    throw new Error("자리 표시를 찾지 못했습니다");
  }
  return bar.style.getPropertyValue("--base-color");
};

describe("SkeletonLoader", () => {
  it("자식을 넘기면 자식을 보여 준다", () => {
    mockedUseTheme.mockReturnValue({ resolvedTheme: "dark" });
    render(
      <SkeletonLoader>
        <p>본문</p>
      </SkeletonLoader>,
    );

    expect(screen.getByText("본문")).toBeInTheDocument();
  });

  it("라이트 테마이면 밝은 자리 표시 색을 쓴다", () => {
    mockedUseTheme.mockReturnValue({ resolvedTheme: "light" });
    const { container } = render(
      <SkeletonLoader>
        <Skeleton />
      </SkeletonLoader>,
    );

    expect(baseColor(container)).toBe("#ebebeb");
    expect(
      container.querySelector(".react-loading-skeleton")?.getAttribute("style"),
    ).toContain("#f5f5f5");
  });

  it("다크 테마이면 어두운 자리 표시 색을 쓴다", () => {
    mockedUseTheme.mockReturnValue({ resolvedTheme: "dark" });
    const { container } = render(
      <SkeletonLoader>
        <Skeleton />
      </SkeletonLoader>,
    );

    expect(baseColor(container)).toBe("#202020");
    expect(
      container.querySelector(".react-loading-skeleton")?.getAttribute("style"),
    ).toContain("#2e2e2e");
  });
});
