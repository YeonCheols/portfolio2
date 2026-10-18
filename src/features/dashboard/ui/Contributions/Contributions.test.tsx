import { render, screen } from "@testing-library/react";
import useSWR from "swr";

import Contributions from "@/features/dashboard/ui/Contributions/Contributions";

jest.mock("swr");
jest.mock("framer-motion", () => {
  const React = require("react");
  const omitMotionProps = ({
    initial,
    animate,
    variants,
    transition,
    whileHover,
    whileTap,
    ...rest
  }: Record<string, unknown>) => rest;

  return {
    animate: (
      _from: number,
      to: number,
      options: { onUpdate?: (value: number) => void },
    ) => {
      options.onUpdate?.(to);
      return { stop: () => undefined };
    },
    motion: {
      span: (props: Record<string, unknown>) =>
        React.createElement("span", omitMotionProps(props)),
      li: (props: Record<string, unknown>) =>
        React.createElement("li", omitMotionProps(props)),
    },
  };
});

const mockedUseSWR = useSWR as jest.Mock;

const calendar = {
  totalContributions: 5,
  weeks: [
    {
      firstDay: "2024-01-01",
      contributionDays: [
        { date: "2024-01-01", contributionCount: 2, color: "#216e39" },
      ],
    },
  ],
  months: [
    {
      name: "Jan",
      firstDay: "2024-01-01",
      totalWeeks: 4,
      contributionsCount: 0,
    },
  ],
  colors: ["#216e39"],
};

describe("Contributions", () => {
  beforeEach(() => {
    mockedUseSWR.mockReturnValue({ data: undefined });
  });

  it("데이터가 없으면 No Data와 사용자 링크를 표시한다", () => {
    render(
      <Contributions
        username="tester"
        type="personal"
        endpoint="/api/github?type=personal"
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Contributions" }),
    ).toBeInTheDocument();
    expect(screen.getByText("No Data")).toBeInTheDocument();
    expect(
      screen.getByText(/contributions in the last year/),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "@tester" })).toHaveAttribute(
      "href",
      "https://github.com/tester",
    );
    expect(mockedUseSWR).toHaveBeenCalledWith(
      "/api/github?type=personal",
      expect.any(Function),
    );
  });

  it("기여 데이터가 있으면 총합과 달력을 표시한다", () => {
    mockedUseSWR.mockReturnValue({
      data: { contributionsCollection: { contributionCalendar: calendar } },
    });

    render(
      <Contributions
        username="tester"
        type="personal"
        endpoint="/api/github?type=personal"
      />,
    );

    expect(screen.queryByText("No Data")).not.toBeInTheDocument();
    expect(
      screen.getByText(/5 contributions in the last year/),
    ).toBeInTheDocument();
    expect(screen.getByText("Total")).toBeInTheDocument();
    expect(screen.getByText("Jan")).toBeInTheDocument();
    expect(screen.getByText("Less")).toBeInTheDocument();
  });
});
