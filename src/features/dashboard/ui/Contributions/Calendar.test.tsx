import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import Calendar from "@/features/dashboard/ui/Contributions/Calendar";

const data = {
  weeks: [
    {
      firstDay: "2024-03-04",
      contributionDays: [
        { date: "2024-03-04", contributionCount: 0, color: "#ebedf0" },
        { date: "2024-03-05", contributionCount: 4, color: "#216e39" },
      ],
    },
  ],
  months: [
    {
      name: "Mar",
      firstDay: "2024-03-01",
      totalWeeks: 4,
      contributionsCount: 0,
    },
    {
      name: "Apr",
      firstDay: "2024-04-01",
      totalWeeks: 1,
      contributionsCount: 0,
    },
  ],
  colors: ["#9be9a8", "#216e39"],
};

describe("Calendar", () => {
  it("데이터가 없으면 Less와 More만 표시한다", () => {
    render(<Calendar />);

    expect(screen.getByText("Less")).toBeInTheDocument();
    expect(screen.getByText("More")).toBeInTheDocument();
    expect(screen.queryByText("Mar")).not.toBeInTheDocument();
  });

  it("월 이름을 표시하고 칸에 마우스를 올리면 기여 수를 표시한다", async () => {
    const user = userEvent.setup();
    const { container } = render(<Calendar data={data} />);
    const cells = container.querySelectorAll("div.overflow-x-auto span");

    expect(screen.getByText("Mar")).toBeInTheDocument();
    expect(screen.getByText("Apr")).toBeInTheDocument();
    expect(cells).toHaveLength(2);
    expect(cells[1]).toHaveStyle({ backgroundColor: "#216e39" });

    await user.hover(cells[1] as HTMLElement);

    expect(
      screen.getByText("4 contributions on 2024-03-05"),
    ).toBeInTheDocument();

    await user.unhover(cells[1] as HTMLElement);

    expect(
      screen.queryByText("4 contributions on 2024-03-05"),
    ).not.toBeInTheDocument();
  });
});
