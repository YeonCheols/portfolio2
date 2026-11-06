import { applyResumeQualityReviews } from "@mcp/modules/resume/quality/apply-resume-quality-reviews";
import type { ResumeQualityEvaluation } from "@mcp/modules/resume/quality/evaluate-resume-pdf";

const evaluation: ResumeQualityEvaluation = {
  run: {
    schemaVersion: 1,
    evaluationId: "gen-1-pdf-quality",
    evaluatedAt: "2026-11-06T00:00:00.000Z",
    domain: "resume",
    contractVersion: "1",
    caseSetVersion: "resume-quality-population-v1",
    policyVersion: "resume-quality-policy-v2",
    inputRef: "gen-1",
    outputRef: "gen-1-pdf",
    cases: [
      {
        metricId: "pdf-layout",
        ruleId: "pdf-page-layout",
        stage: "pdf",
        caseId: "pdf-page/1",
        unit: "page_layout_check",
        decision: "needs_review",
        blocking: false,
        evidence: [{ kind: "pdf_page", reference: "gen-1-pdf/page/1" }],
        reasonCode: "PDF_PAGE_LAYOUT_REQUIRES_VISUAL_REVIEW",
      },
      {
        metricId: "required-fact-preservation",
        ruleId: "source-fact-preserved",
        stage: "pdf",
        caseId: "source-fact/selection/profile/0/name/text",
        unit: "source_fact",
        decision: "fail",
        blocking: true,
        evidence: [{ kind: "source_fact", reference: "profile-1" }],
      },
    ],
  },
  aggregates: [],
};

describe("applyResumeQualityReviews", () => {
  it("미해결 케이스에 승인 판정을 적용하고 정책 집계를 다시 계산한다", () => {
    const reviewed = applyResumeQualityReviews(evaluation, [
      {
        reviewId: "review-1",
        evaluationId: "gen-1-pdf-quality",
        caseSetVersion: "resume-quality-population-v1",
        policyVersion: "resume-quality-policy-v2",
        inputRef: "gen-1",
        outputRef: "gen-1-pdf",
        caseId: "pdf-page/1",
        decision: "pass",
        reviewedAt: "2026-11-06T01:00:00.000Z",
        reviewerHash: "reviewer-hash",
      },
    ]);

    expect(reviewed.run.cases[0]).toMatchObject({
      decision: "pass",
      blocking: false,
      reasonCode: "HUMAN_REVIEW_PASSED",
    });
    expect(reviewed.manualReviews).toEqual([
      expect.objectContaining({ caseId: "pdf-page/1", decision: "pass" }),
    ]);
    expect(reviewed.run.cases[1].decision).toBe("fail");
    expect(
      reviewed.aggregates.find(({ metricId }) => metricId === "pdf-layout"),
    ).toMatchObject({ passedCases: 1, denominator: 1, blockingCases: 0 });
    expect(reviewed.aggregates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          metricId: "required-fact-preservation",
          blockingCases: 1,
        }),
      ]),
    );
  });

  it("문제 발견 판정은 완료 게이트를 계속 차단한다", () => {
    const reviewed = applyResumeQualityReviews(evaluation, [
      {
        reviewId: "review-2",
        evaluationId: "gen-1-pdf-quality",
        caseSetVersion: "resume-quality-population-v1",
        policyVersion: "resume-quality-policy-v2",
        inputRef: "gen-1",
        outputRef: "gen-1-pdf",
        caseId: "pdf-page/1",
        decision: "fail",
        reviewedAt: "2026-11-06T01:00:00.000Z",
        reviewerHash: "reviewer-hash",
      },
    ]);

    expect(reviewed.run.cases[0]).toMatchObject({
      decision: "fail",
      blocking: true,
    });
    expect(
      reviewed.aggregates.find(({ metricId }) => metricId === "pdf-layout")
        ?.blockingCases,
    ).toBe(1);
  });
});
