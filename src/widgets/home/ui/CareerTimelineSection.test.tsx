import { render, screen } from "@testing-library/react";

import CareerTimelineSection from "@/widgets/home/ui/CareerTimelineSection";

describe("CareerTimelineSection", () => {
  it("타임라인 제목과 회사 이름을 보여 준다", () => {
    render(<CareerTimelineSection />);

    expect(
      screen.getByRole("heading", { name: "타임라인" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "잡코리아" })).toHaveAttribute(
      "href",
      "https://m.albamon.com/",
    );
    expect(screen.getByRole("link", { name: "행복쇼핑" })).toHaveAttribute(
      "href",
      "https://m.pping.kr/",
    );
    expect(screen.getByRole("link", { name: "한국후지필름" })).toHaveAttribute(
      "href",
      "https://www.fujifilm.co.kr/",
    );
    expect(screen.getByText(/알바몬 MSA 프로젝트/)).toBeInTheDocument();
  });

  it("여정 헤더를 보여 주지 않는다", () => {
    render(<CareerTimelineSection />);

    expect(screen.queryByText("나의 여정")).not.toBeInTheDocument();
    expect(screen.queryByText("경력사항")).not.toBeInTheDocument();
  });
});
