import { render } from "@testing-library/react";

import AnimatedBars from "@/shared/ui/AnimatedBars";

describe("AnimatedBars", () => {
  it("variant를 생략하면 기본 색의 막대 네 개를 렌더한다", () => {
    const { container } = render(<AnimatedBars />);
    const bars = container.querySelectorAll("span");

    expect(bars).toHaveLength(4);
    bars.forEach((bar) => {
      expect(bar).toHaveClass("bg-neutral-800");
    });
  });

  it("variant를 넘기면 그 색의 막대를 렌더한다", () => {
    const { container } = render(<AnimatedBars variant="bg-green-500" />);
    const bars = container.querySelectorAll("span");

    expect(bars).toHaveLength(4);
    bars.forEach((bar) => {
      expect(bar).toHaveClass("bg-green-500");
    });
  });
});
