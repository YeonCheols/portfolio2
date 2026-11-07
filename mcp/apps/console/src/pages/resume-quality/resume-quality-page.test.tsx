import { render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { stubChartSize } from "../../test/chart-size";

import { ResumeQualityPage } from "./resume-quality-page";

describe("ResumeQualityPage", () => {
  beforeEach(() => stubChartSize());
  afterEach(() => vi.unstubAllGlobals());

  it("품질 평가를 조회하는 동안 로딩 표시를 보여준다", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockReturnValue(new Promise<Response>(() => {})),
    );

    render(<ResumeQualityPage search="" />);

    expect(screen.getByRole("status").textContent).toContain("불러오는 중");
    expect(screen.getByTestId("loading-spinner")).toBeTruthy();
  });

  it("선택한 환경의 모든 평가 기록을 합산한 통계만 보여주고 기록별 목록은 두지 않는다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          truncated: false,
          archivesScanned: 1,
          items: [
            {
              archive: {
                environment: "production",
                subjectHash: "subject-hash",
                generationId: "gen-1",
                attemptId: "att-1",
                status: "failed",
                startedAt: "2026-11-06T00:00:00.000Z",
              },
              evaluationId: "gen-1-pdf-quality",
              evaluatedAt: "2026-11-06T00:01:00.000Z",
              metrics: [
                {
                  metricId: "pdf-layout",
                  confirmedRate: null,
                  lowerBound: 0.75,
                  upperBound: 1,
                  denominator: 8,
                  blockingCases: 1,
                  needsReviewCases: 2,
                  failedCases: 1,
                  passedCases: 5,
                },
              ],
            },
          ],
        }),
      }),
    );

    render(<ResumeQualityPage search="?environment=production&page=1" />);

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "이력서 품질 대시보드",
      }),
    ).toBeTruthy();
    const kpi = within(screen.getByRole("region", { name: "핵심 지표" }));
    expect(kpi.getByText("검토 대기").closest("div")?.textContent).toContain(
      "2건",
    );
    expect(kpi.getByText("차단 항목").closest("div")?.textContent).toContain(
      "1건",
    );
    expect(kpi.getByText("통과율").closest("div")?.textContent).toContain(
      "63%",
    );
    expect(
      screen.getByRole("heading", { level: 2, name: "지표별 통과율" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("heading", { level: 2, name: "판정 구성" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("heading", { level: 2, name: "통과율 추이" }),
    ).toBeTruthy();
    expect(
      screen.getByText("추이를 그리려면 평가 기록이 2건 이상 필요합니다."),
    ).toBeTruthy();
    expect(screen.getByRole("table", { name: "지표별 수치" })).toBeTruthy();
    expect(
      screen.getByRole("heading", { level: 2, name: "이 화면은 무엇인가요?" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("heading", { level: 2, name: "지표 설명" }),
    ).toBeTruthy();
    expect(
      screen.getByText(
        "지표마다 검사 건 중 몇 %가 통과했는지 보여줍니다. 막대가 길수록 좋고, 높은 순서로 정렬했습니다.",
      ),
    ).toBeTruthy();
    expect(screen.getByText("기록 1건을 합산했습니다.")).toBeTruthy();
    expect(screen.queryByRole("article")).toBeNull();
    expect(
      screen.queryByRole("navigation", { name: "품질 평가 페이지" }),
    ).toBeNull();
    expect(screen.queryByRole("link", { name: /gen-1/ })).toBeNull();
  });

  it("모든 지표 목록을 통과율이 높은 순서로 같게 보여준다", async () => {
    const metric = (metricId: string, passedCases: number) => ({
      metricId,
      confirmedRate: null,
      lowerBound: null,
      upperBound: null,
      denominator: 4,
      blockingCases: 0,
      needsReviewCases: 0,
      failedCases: 4 - passedCases,
      passedCases,
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          truncated: false,
          archivesScanned: 1,
          items: [
            {
              archive: {
                environment: "development",
                subjectHash: "s",
                generationId: "g",
                attemptId: "a",
                status: "completed",
              },
              evaluationId: "g-pdf-quality",
              evaluatedAt: "2026-11-06T00:01:00.000Z",
              metrics: [metric("pdf-layout", 1), metric("claim-support", 4)],
            },
          ],
        }),
      }),
    );

    render(<ResumeQualityPage search="" />);

    expect(
      (await screen.findByRole("img", { name: /^지표별 통과율/ })).getAttribute(
        "aria-label",
      ),
    ).toBe("지표별 통과율: 문장 근거 100%, PDF 레이아웃 25%");
    const bars = screen
      .getAllByRole("img", { name: /통과 \d+건/ })
      .map((node) => node.getAttribute("aria-label")?.split(" ")[0]);
    expect(bars).toEqual(["문장", "PDF"]);
    const rows = within(
      screen.getByRole("table", { name: "지표별 수치" }),
    ).getAllByRole("row");
    expect(rows[1].textContent).toContain("문장 근거");
    expect(rows[2].textContent).toContain("PDF 레이아웃");
  });

  it("서버가 최근 실행까지만 읽었다고 알리면 몇 개까지 합산했는지 안내한다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          items: [
            {
              archive: {
                environment: "development",
                subjectHash: "s",
                generationId: "g",
                attemptId: "a",
                status: "completed",
              },
              evaluationId: "g-pdf-quality",
              evaluatedAt: "2026-11-06T00:01:00.000Z",
              metrics: [
                {
                  metricId: "pdf-layout",
                  confirmedRate: 1,
                  lowerBound: 1,
                  upperBound: 1,
                  denominator: 1,
                  blockingCases: 0,
                  needsReviewCases: 0,
                  failedCases: 0,
                  passedCases: 1,
                },
              ],
            },
          ],
          truncated: true,
          archivesScanned: 300,
        }),
      }),
    );

    render(<ResumeQualityPage search="" />);

    expect(
      await screen.findByText(/실행이 많아 최근 300개까지만 합산했습니다/),
    ).toBeTruthy();
  });
});
