import { render, screen } from "@testing-library/react";

import Progress from "@/features/dashboard/ui/CodingActive/Progress";

describe("Progress", () => {
  it("퍼센트가 없으면 0%를 표시한다", () => {
    render(<Progress data={{ name: "Go" }} />);

    expect(screen.getByText("Go")).toBeInTheDocument();
    expect(screen.getByText("0%")).toBeInTheDocument();
  });

  it("퍼센트를 정수로 반올림해서 표시한다", () => {
    render(<Progress data={{ name: "TypeScript", percent: 12.6 }} />);

    expect(screen.getByText("TypeScript")).toBeInTheDocument();
    expect(screen.getByText("13%")).toBeInTheDocument();
  });
});
