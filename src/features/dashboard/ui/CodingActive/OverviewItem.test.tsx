import { render, screen } from "@testing-library/react";

import OverviewItem from "@/features/dashboard/ui/CodingActive/OverviewItem";

describe("CodingActive OverviewItem", () => {
  it("라벨과 값을 보여 준다", () => {
    render(<OverviewItem label="오늘" value="2 hrs" />);

    expect(screen.getByText("오늘")).toBeInTheDocument();
    expect(screen.getByText("2 hrs")).toBeInTheDocument();
  });

  it("값이 비어 있으면 대시를 보여 준다", () => {
    render(<OverviewItem label="오늘" value="" />);

    expect(screen.getByText("-")).toBeInTheDocument();
  });
});
