import { render, screen } from "@testing-library/react";
import useSWR from "swr";

import CodingActive from "@/features/dashboard/ui/CodingActive/CodingActive";

jest.mock("swr");

const mockedUseSWR = useSWR as jest.Mock;

describe("CodingActive", () => {
  beforeEach(() => {
    mockedUseSWR.mockReturnValue({ data: undefined });
  });

  it("주간 통계 제목과 WakaTime 링크를 표시한다", () => {
    render(<CodingActive />);

    expect(
      screen.getByRole("heading", { name: "Weekly Statistics" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "WakaTime" })).toHaveAttribute(
      "href",
      "https://wakatime.com/@aulianza",
    );
    expect(screen.getByText(/last 7 days stats/)).toBeInTheDocument();
    expect(screen.getByText(/Last update:/)).toBeInTheDocument();
    expect(mockedUseSWR).toHaveBeenCalledWith(
      "/api/read-stats",
      expect.any(Function),
    );
  });

  it("마지막 갱신 시각이 있으면 상대 시간을 표시한다", () => {
    render(<CodingActive lastUpdate="2020-01-01T00:00:00" />);

    expect(screen.getByText(/ago/)).toBeInTheDocument();
  });

  it("응답의 last_update가 있으면 상대 시간을 표시한다", () => {
    mockedUseSWR.mockReturnValue({
      data: { last_update: "2020-01-01T00:00:00" },
    });

    render(<CodingActive />);

    expect(screen.getByText(/ago/)).toBeInTheDocument();
  });

  it("통계 데이터가 있으면 개요와 언어 이름을 표시한다", () => {
    mockedUseSWR.mockReturnValue({
      data: {
        human_readable_total: "10 hrs",
        languages: [{ name: "TypeScript", hours: 1, minutes: 30, percent: 80 }],
      },
    });

    render(<CodingActive />);

    expect(screen.getByText("10 hrs")).toBeInTheDocument();
    expect(screen.getByText("TypeScript")).toBeInTheDocument();
    expect(screen.getByText("Languages")).toBeInTheDocument();
  });
});
