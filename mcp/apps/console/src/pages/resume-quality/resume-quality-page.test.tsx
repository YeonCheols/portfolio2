import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ResumeQualityPage } from "./resume-quality-page";

describe("ResumeQualityPage", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("환경별 평가와 지표 점수, 검토·차단 건수 및 아카이브 상세 링크를 보여준다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          hasMore: false,
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
    expect(screen.getByText("75–100% 예상 범위")).toBeTruthy();
    expect(screen.getByText("검토 대기").closest("div")?.textContent).toContain(
      "2건",
    );
    expect(screen.getByText("차단 항목").closest("div")?.textContent).toContain(
      "1건",
    );
    expect(
      screen.getByRole("link", { name: /gen-1/ }).getAttribute("href"),
    ).toContain("subjectHash=subject-hash");
  });
});
