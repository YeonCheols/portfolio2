import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { QualityKpiRow } from "./quality-kpi-row";

const totals = {
  records: 2,
  passed: 10,
  failed: 1,
  needsReview: 2,
  blocking: 2,
  denominator: 14,
};

describe("QualityKpiRow", () => {
  it("평가 기록·통과율·검토 대기·실패·차단 항목을 타일로 보여준다", () => {
    render(<QualityKpiRow totals={totals} />);

    const region = within(screen.getByRole("region", { name: "핵심 지표" }));
    const valueOf = (label: string) =>
      region.getByText(label).closest("div")?.textContent;
    expect(valueOf("평가 기록")).toContain("2건");
    expect(valueOf("통과율")).toContain("71%");
    expect(valueOf("검토 대기")).toContain("2건");
    expect(valueOf("실패")).toContain("1건");
    expect(valueOf("차단 항목")).toContain("2건");
  });

  it("분모가 0이면 통과율을 측정 대기로 표시한다", () => {
    render(<QualityKpiRow totals={{ ...totals, denominator: 0, passed: 0 }} />);

    expect(screen.getByText("통과율").closest("div")?.textContent).toContain(
      "측정 대기",
    );
  });

  it("타일마다 일반 개발자가 읽을 수 있는 한 줄 설명을 단다", () => {
    render(<QualityKpiRow totals={totals} />);

    const region = within(screen.getByRole("region", { name: "핵심 지표" }));
    expect(region.getByText("통과 건수 ÷ 전체 검사 건수")).toBeTruthy();
    expect(
      region.getByText(
        "자동으로 판정하지 못해 사람의 확인을 기다리는 검사 건수",
      ),
    ).toBeTruthy();
    expect(
      region.getByText("있으면 PDF 변환이 거절되는 검사 건수"),
    ).toBeTruthy();
  });

  it("통과율 다음의 건수 타일은 높은 수치부터 보여주고 같으면 정해 둔 순서를 지킨다", () => {
    render(<QualityKpiRow totals={totals} />);

    const region = screen.getByRole("region", { name: "핵심 지표" });
    const labels = [...region.querySelectorAll("div > p:first-child")].map(
      (node) => node.textContent,
    );
    expect(labels).toEqual([
      "통과율",
      "평가 기록",
      "검토 대기",
      "차단 항목",
      "실패",
    ]);
  });
});
