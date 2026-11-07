import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { OutcomeBars } from "./outcome-bars";
import { rows } from "./quality-fixtures";

describe("OutcomeBars", () => {
  it("지표마다 판정 구성을 막대로 보여주고 읽을 수 있는 요약을 단다", () => {
    render(<OutcomeBars rows={rows} />);

    const bar = screen.getByRole("img", { name: /^PDF 레이아웃/ });
    expect(bar.getAttribute("aria-label")).toBe(
      "PDF 레이아웃 통과 8건, 검토 대기 2건, 실패 1건, 측정 실패 1건",
    );
    expect(
      screen
        .getByRole("img", { name: /^맞춤법·표기/ })
        .getAttribute("aria-label"),
    ).toBe("맞춤법·표기 통과 2건");
  });

  it("건수가 있는 판정만 분모에 비례한 너비로 그린다", () => {
    render(<OutcomeBars rows={rows} />);

    const segments = within(
      screen.getByRole("img", { name: /^PDF 레이아웃/ }),
    ).getAllByTestId("outcome-segment");
    expect(segments.map((segment) => segment.style.width)).toEqual([
      "66.66666666666666%",
      "16.666666666666664%",
      "8.333333333333332%",
      "8.333333333333332%",
    ]);
  });

  it("분모가 없는 지표는 막대 대신 측정 대기를 알린다", () => {
    render(<OutcomeBars rows={rows} />);

    expect(
      screen.getByText("수치 정확성").closest("li")?.textContent,
    ).toContain("측정 대기");
    expect(screen.queryByRole("img", { name: /^수치 정확성/ })).toBeNull();
  });

  it("색에만 기대지 않도록 범례에 기호와 이름을 함께 둔다", () => {
    render(<OutcomeBars rows={rows} />);

    const legend = screen.getByRole("list", { name: "판정 범례" });
    expect(legend.textContent).toContain("✓ 통과");
    expect(legend.textContent).toContain("! 검토 대기");
    expect(legend.textContent).toContain("✕ 실패");
    expect(legend.textContent).toContain("– 측정 실패");
  });

  it("막대 조각에 마우스를 올리면 건수와 퍼센트를 말풍선으로 보여주고 벗어나면 숨긴다", async () => {
    const user = userEvent.setup();
    render(<OutcomeBars rows={rows} />);

    expect(screen.queryByRole("tooltip")).toBeNull();
    const [passed, review] = within(
      screen.getByRole("img", { name: /^PDF 레이아웃/ }),
    ).getAllByTestId("outcome-segment");

    await user.hover(passed);
    expect(screen.getByRole("tooltip").textContent).toBe("통과 8건 (67%)");

    await user.hover(review);
    expect(screen.getAllByRole("tooltip")).toHaveLength(1);
    expect(screen.getByRole("tooltip").textContent).toBe("검토 대기 2건 (17%)");

    await user.unhover(review);
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("전체의 1%보다 작은 조각은 0%가 아니라 1% 미만으로 알린다", async () => {
    const user = userEvent.setup();
    render(
      <OutcomeBars
        rows={[
          {
            metricId: "claim-support",
            passed: 300,
            failed: 1,
            needsReview: 0,
            blocking: 0,
            undecided: 0,
            denominator: 301,
            rate: 300 / 301,
          },
        ]}
      />,
    );

    const segments = screen.getAllByTestId("outcome-segment");
    await user.hover(segments[1]);

    expect(screen.getByRole("tooltip").textContent).toBe("실패 1건 (1% 미만)");
  });
});
