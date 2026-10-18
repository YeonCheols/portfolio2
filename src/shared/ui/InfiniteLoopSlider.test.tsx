import { render, screen } from "@testing-library/react";

import InfiniteLoopSlider from "@/shared/ui/InfiniteLoopSlider";

const animationDirection = (text: string) => {
  const node = screen.getByText(text).parentElement;
  const fromDom = node ? getComputedStyle(node).animationDirection : "";
  if (fromDom) {
    return fromDom;
  }
  return document.head.innerHTML.includes("animation-direction:reverse")
    ? "reverse"
    : "normal";
};

describe("InfiniteLoopSlider", () => {
  it("자식을 렌더하고 정방향 애니메이션을 둔다", () => {
    render(
      <InfiniteLoopSlider>
        <span>태그</span>
      </InfiniteLoopSlider>,
    );

    expect(screen.getByText("태그")).toBeInTheDocument();
    expect(animationDirection("태그")).toBe("normal");
  });

  it("isReverse면 역방향 애니메이션을 둔다", () => {
    render(
      <InfiniteLoopSlider isReverse>
        <span>태그</span>
      </InfiniteLoopSlider>,
    );

    expect(animationDirection("태그")).toBe("reverse");
  });
});
