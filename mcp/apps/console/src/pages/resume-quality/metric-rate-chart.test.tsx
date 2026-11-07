import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { MetricRateChart } from "./metric-rate-chart";
import { rows } from "./quality-fixtures";
import { stubChartSize } from "../../test/chart-size";

describe("MetricRateChart", () => {
  beforeEach(() => stubChartSize());

  it("지표별 통과율을 읽을 수 있는 요약과 함께 막대 차트로 그린다", () => {
    const { container } = render(<MetricRateChart rows={rows} />);

    const figure = screen.getByRole("img", { name: /지표별 통과율/ });
    expect(figure.getAttribute("aria-label")).toBe(
      "지표별 통과율: PDF 레이아웃 67%, 맞춤법·표기 100%, 수치 정확성 측정 대기",
    );
    expect(container.querySelector(".recharts-wrapper")).not.toBeNull();
    expect(container.querySelectorAll(".recharts-bar-rectangle")).toHaveLength(
      2,
    );
  });
});
