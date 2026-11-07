import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { points } from "./quality-fixtures";
import { TrendChart } from "./trend-chart";
import { stubChartSize } from "../../test/chart-size";

describe("TrendChart", () => {
  beforeEach(() => stubChartSize());

  it("평가 기록이 2건보다 적으면 차트 대신 안내한다", () => {
    const { container } = render(
      <TrendChart metricIds={["pdf-layout"]} points={points.slice(0, 1)} />,
    );

    expect(
      screen.getByText("추이를 그리려면 평가 기록이 2건 이상 필요합니다."),
    ).toBeTruthy();
    expect(container.querySelector(".recharts-wrapper")).toBeNull();
  });

  it("지표가 둘 이상이면 선 차트와 지표 이름 범례를 보여준다", () => {
    const { container } = render(
      <TrendChart
        metricIds={["pdf-layout", "text-proofreading"]}
        points={points}
      />,
    );

    expect(
      screen
        .getByRole("img", { name: /통과율 추이/ })
        .getAttribute("aria-label"),
    ).toBe("통과율 추이: 평가 기록 2건, 지표 2개");
    expect(container.querySelector(".recharts-wrapper")).not.toBeNull();
    const legend = screen.getByRole("list", { name: "지표 범례" });
    expect(legend.textContent).toContain("PDF 레이아웃");
    expect(legend.textContent).toContain("맞춤법·표기");
  });

  it("지표가 하나면 범례 상자를 두지 않는다", () => {
    render(<TrendChart metricIds={["pdf-layout"]} points={points} />);

    expect(screen.queryByRole("list", { name: "지표 범례" })).toBeNull();
  });
});
