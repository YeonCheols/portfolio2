import { render, screen } from "@testing-library/react";

import Overview from "@/features/dashboard/ui/Contributions/Overview";

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

describe("Contributions Overview", () => {
  it("주차별 기여로 총합과 이번 주, 최고, 평균을 표시한다", () => {
    render(
      <Overview
        data={{
          totalContributions: 8,
          weeks: [
            {
              contributionDays: [
                { contributionCount: 1 },
                { contributionCount: 2 },
              ],
            },
            {
              contributionDays: [{ contributionCount: 5 }],
            },
          ],
        }}
      />,
    );

    expect(screen.getByText("Total")).toBeInTheDocument();
    expect(screen.getByText("This Week")).toBeInTheDocument();
    expect(screen.getByText("Best Day")).toBeInTheDocument();
    expect(screen.getByText("Average")).toBeInTheDocument();
    expect(screen.getByText("/ day")).toBeInTheDocument();
    expect(screen.getAllByText("5")).toHaveLength(2);
    expect(screen.getByText("8")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("주차가 없으면 이번 주는 0이고 최고와 평균은 비숫자가 된다", () => {
    render(<Overview data={{}} />);

    expect(screen.getAllByText("0").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("-Infinity")).toBeInTheDocument();
    expect(screen.getByText("NaN")).toBeInTheDocument();
  });
});
