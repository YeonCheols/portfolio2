import { render, screen } from "@testing-library/react";

import AnimateCounter from "@/shared/ui/AnimateCounter";

describe("AnimateCounter", () => {
  it("total을 넘기면 소수점을 버린 숫자를 표시한다", async () => {
    render(<AnimateCounter id="count" total={8.9} />);

    const count = await screen.findByText("8");
    expect(document.getElementById("count")).toBe(count);
  });

  it("total이 0이면 0을 표시한다", async () => {
    render(<AnimateCounter total={0} />);

    expect(await screen.findByText("0")).toBeInTheDocument();
  });
});
