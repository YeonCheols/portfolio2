import { render, screen } from "@testing-library/react";
import useSWR from "swr";

import Dashboard from "@/features/dashboard/ui/Dashboard";

jest.mock("swr");
jest.mock("@/shared/config/github", () => ({
  GITHUB_ACCOUNTS: [
    {
      username: "tester",
      endpoint: "/api/github?type=personal",
      type: "personal",
      is_active: true,
    },
    {
      username: "hidden",
      endpoint: "/api/github?type=hidden",
      type: "personal",
      is_active: false,
    },
  ],
}));
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

describe("Dashboard", () => {
  beforeEach(() => {
    mockedUseSWR.mockImplementation((key: string) => {
      if (key === "/api/read-stats") {
        return { data: { human_readable_total: "3 hrs" } };
      }
      return { data: undefined };
    });
  });

  it("활성 계정만 기여 구역과 코딩 통계를 표시한다", () => {
    render(<Dashboard />);

    expect(
      screen.getByRole("heading", { name: "Weekly Statistics" }),
    ).toBeInTheDocument();
    expect(screen.getByText("3 hrs")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Contributions" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "@tester" })).toBeInTheDocument();
    expect(screen.getByText("No Data")).toBeInTheDocument();
    expect(screen.queryByText("@hidden")).not.toBeInTheDocument();
    expect(mockedUseSWR).toHaveBeenCalledWith(
      "/api/github?type=personal",
      expect.any(Function),
    );
  });
});
