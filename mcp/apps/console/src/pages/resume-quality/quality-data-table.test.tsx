import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { points, rows } from "./quality-fixtures";
import { QualityDataTable } from "./quality-data-table";

describe("QualityDataTable", () => {
  it("차트와 같은 수치를 표로 보여준다", () => {
    render(
      <QualityDataTable
        rows={rows}
        metricIds={["pdf-layout", "text-proofreading"]}
        points={points}
      />,
    );

    const metrics = within(screen.getByRole("table", { name: "지표별 수치" }));
    const layout = metrics.getByRole("row", { name: /PDF 레이아웃/ });
    expect(layout.textContent).toContain("67%");
    expect(layout.textContent).toContain("12");
    expect(
      metrics.getByRole("row", { name: /수치 정확성/ }).textContent,
    ).toContain("측정 대기");

    const trend = within(
      screen.getByRole("table", { name: "통과율 추이 수치" }),
    );
    expect(
      trend.getByRole("row", { name: /11-06 09:30/ }).textContent,
    ).toContain("75%");
    expect(
      trend.getByRole("row", { name: /11-05 01:00/ }).textContent,
    ).toContain("–");
  });
});
