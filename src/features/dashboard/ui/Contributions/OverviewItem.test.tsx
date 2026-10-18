import { render, screen } from "@testing-library/react";

import OverviewItem from "@/features/dashboard/ui/Contributions/OverviewItem";

jest.mock("framer-motion", () => ({
  animate: (
    _from: number,
    to: number,
    options: { onUpdate?: (value: number) => void },
  ) => {
    options.onUpdate?.(to);
    return { stop: () => undefined };
  },
}));

describe("Contributions OverviewItem", () => {
  it("라벨과 값과 단위를 표시한다", () => {
    render(<OverviewItem label="Average" value={3} unit="/ day" />);

    expect(screen.getByText("Average")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("/ day")).toBeInTheDocument();
  });

  it("단위가 없으면 값만 표시한다", () => {
    render(<OverviewItem label="Total" value={0} />);

    expect(screen.getByText("Total")).toBeInTheDocument();
    expect(screen.getByText("0")).toBeInTheDocument();
    expect(screen.queryByText("/ day")).not.toBeInTheDocument();
  });
});
