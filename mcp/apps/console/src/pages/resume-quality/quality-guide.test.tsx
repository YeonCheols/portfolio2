import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MetricGuide, QualityGuide } from "./quality-guide";

describe("QualityGuide", () => {
  it("이 화면이 무엇을 검사한 결과인지 쉬운 말로 설명한다", () => {
    render(<QualityGuide />);

    expect(
      screen.getByRole("heading", { level: 2, name: "이 화면은 무엇인가요?" }),
    ).toBeTruthy();
    expect(
      screen.getByText(/AI가 만든 이력서를 PDF로 바꾼 뒤/).textContent,
    ).toContain("7가지 기준");
  });

  it("통과율·통과·검토 대기·실패·측정 실패·차단의 뜻을 용어 목록으로 보여준다", () => {
    render(<QualityGuide />);

    const terms = within(screen.getByRole("list", { name: "용어 설명" }));
    for (const term of [
      "통과율",
      "통과",
      "검토 대기",
      "실패",
      "측정 실패",
      "차단",
    ])
      expect(terms.getByText(term)).toBeTruthy();
    expect(terms.getByText("통과").closest("li")?.textContent).toContain(
      "기준을 만족",
    );
  });
});

describe("MetricGuide", () => {
  it("지표 7가지를 한글 이름과 설명, 개발자용 ID와 함께 보여준다", () => {
    render(<MetricGuide />);

    expect(
      screen.getByRole("heading", { level: 2, name: "지표 설명" }),
    ).toBeTruthy();
    const items = within(
      screen.getByRole("list", { name: "지표 목록" }),
    ).getAllByRole("listitem");
    expect(items).toHaveLength(7);
    const layout = items.find((item) =>
      item.textContent?.includes("PDF 레이아웃"),
    );
    expect(layout?.textContent).toContain("pdf-layout");
    expect(layout?.textContent).toContain("잘리거나 겹치");
  });
});
