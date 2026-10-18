import { render, screen } from "@testing-library/react";

import Overview from "@/features/dashboard/ui/CodingActive/Overview";

describe("CodingActive Overview", () => {
  it("값이 없으면 대시와 N/A를 표시한다", () => {
    render(<Overview data={{}} />);

    expect(screen.getAllByText("-")).toHaveLength(2);
    expect(screen.getAllByText("N/A")).toHaveLength(4);
    expect(screen.getByText("Start Date")).toBeInTheDocument();
    expect(screen.getByText("End Date")).toBeInTheDocument();
    expect(screen.getByText("Daily Coding Average")).toBeInTheDocument();
    expect(screen.getByText("This Week Coding Time")).toBeInTheDocument();
    expect(screen.getByText("Best Day Coding Time")).toBeInTheDocument();
    expect(screen.getByText("All Time Since Today")).toBeInTheDocument();
  });

  it("최고 기록 날짜가 없으면 N/A를 표시한다", () => {
    render(<Overview data={{ best_day: { text: "5 hrs" } }} />);

    expect(screen.getAllByText("N/A").length).toBeGreaterThan(0);
    expect(screen.queryByText(/5 hrs/)).not.toBeInTheDocument();
  });

  it("기간과 코딩 시간을 표시한다", () => {
    render(
      <Overview
        data={{
          human_readable_total: "10 hrs",
          human_readable_daily_average: "2 hrs",
          best_day: { text: "5 hrs", date: "2024-01-15T12:00:00+07:00" },
          all_time_since_today: { text: "100 hrs" },
          start_date: "2024-01-01T12:00:00+07:00",
          end_date: "2024-01-07T12:00:00+07:00",
        }}
      />,
    );

    expect(screen.getByText("January 01, 2024")).toBeInTheDocument();
    expect(screen.getByText("January 07, 2024")).toBeInTheDocument();
    expect(screen.getByText("2 hrs")).toBeInTheDocument();
    expect(screen.getByText("10 hrs")).toBeInTheDocument();
    expect(screen.getByText("January 15, 2024 (5 hrs)")).toBeInTheDocument();
    expect(screen.getByText("100 hrs")).toBeInTheDocument();
  });
});
