import { evaluateResumePdfQuality } from "@mcp/modules/resume/quality/evaluate-resume-pdf";

const generated = {
  resume: "매출 20% 개선",
  selection: [],
  validationMode: "source_evidence" as const,
  claims: [
    {
      text: "매출 20% 개선",
      sourceIds: ["source-1"],
      sources: [],
      evidence: [{ sourceId: "source-1", quote: "매출 20% 개선" }],
    },
  ],
  gaps: [],
  validationIssues: [],
  conflicts: [],
  uncertain: [],
};

describe("evaluateResumePdfQuality", () => {
  it("출력 주장을 생성하고 인용 검증만으로 의미 통과를 주지 않는다", () => {
    const run = evaluateResumePdfQuality({
      generated,
      evaluationId: "evaluation-1",
      evaluatedAt: "2026-11-06T00:00:00.000Z",
      inputRef: "snapshot-1",
      outputRef: "output-1",
    });

    expect(run.run.cases).toEqual([
      expect.objectContaining({
        metricId: "claim-support",
        caseId: "claim/0",
        decision: "needs_review",
        blocking: true,
        evidence: [
          { kind: "source_fact", reference: "source-1" },
          { kind: "output_claim", reference: "claim/0" },
        ],
      }),
      expect.objectContaining({
        metricId: "numeric-integrity",
        caseId: "numeric/0/0/20",
        decision: "needs_review",
        blocking: true,
      }),
    ]);
    expect(run.aggregates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          metricId: "claim-support",
          passedCases: 0,
          needsReviewCases: 1,
          denominator: 1,
          confirmedRate: null,
          blockingCases: 1,
        }),
        expect.objectContaining({
          metricId: "numeric-integrity",
          needsReviewCases: 1,
          denominator: 1,
        }),
      ]),
    );
  });

  it("사실 주장이 없으면 claim 모집단을 빈 배열로 둔다", () => {
    const run = evaluateResumePdfQuality({
      generated: { ...generated, claims: [], resume: "경력" },
      evaluationId: "evaluation-1",
      evaluatedAt: "2026-11-06T00:00:00.000Z",
      inputRef: "snapshot-1",
      outputRef: "output-1",
    });

    expect(run.run.cases).toEqual([]);
    expect(run.aggregates.every(({ denominator }) => denominator === 0)).toBe(
      true,
    );
  });
});
