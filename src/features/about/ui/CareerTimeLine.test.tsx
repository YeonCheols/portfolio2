import { render, screen } from "@testing-library/react";

import CareerTimeLine from "@/features/about/ui/CareerTimeLine";
import { TimelineItem } from "@/shared/types/careers";

const items: TimelineItem[] = [
  {
    date: "2022-10 — 2026-04",
    title: "잡코리아",
    description: <span>알바몬 개발</span>,
    link: "https://m.albamon.com/",
  },
  {
    date: "2019-03 — 2021-04",
    title: "한국후지필름",
    description: <span>웹 사이트 개발</span>,
  },
];

describe("CareerTimeLine", () => {
  it("헤더와 경력 항목을 보여 준다", () => {
    render(<CareerTimeLine items={items} />);

    expect(screen.getByText("경력사항")).toBeInTheDocument();
    expect(screen.getByText("나의 여정")).toBeInTheDocument();
    expect(screen.getByText("2022-10 — 2026-04")).toBeInTheDocument();
    expect(screen.getByText("알바몬 개발")).toBeInTheDocument();
    expect(screen.getByText("웹 사이트 개발")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "한국후지필름" }),
    ).toBeInTheDocument();
  });

  it("링크가 있으면 제목을 외부 링크로 보여 준다", () => {
    render(<CareerTimeLine items={items} />);

    expect(screen.getByRole("link", { name: "잡코리아" })).toHaveAttribute(
      "href",
      "https://m.albamon.com/",
    );
    expect(
      screen.queryByRole("link", { name: "한국후지필름" }),
    ).not.toBeInTheDocument();
  });

  it("헤더를 숨기면 여정 제목을 보여 주지 않는다", () => {
    render(<CareerTimeLine items={items} hideHeader />);

    expect(screen.queryByText("나의 여정")).not.toBeInTheDocument();
    expect(screen.queryByText("경력사항")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "잡코리아" })).toBeInTheDocument();
  });

  it("항목이 없으면 헤더만 보여 준다", () => {
    render(<CareerTimeLine items={[]} />);

    expect(screen.getByText("나의 여정")).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
