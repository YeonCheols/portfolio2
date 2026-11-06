import { createResumeQualityEvaluation } from "@mcp/modules/resume/quality/create-resume-quality-evaluation";

describe("createResumeQualityEvaluation", () => {
  it("이력서 정책에 따라 공용 계약의 이력서 평가 실행을 만든다", () => {
    const run = createResumeQualityEvaluation({
      evaluationId: "evaluation-1",
      evaluatedAt: "2026-11-06T00:00:00.000Z",
      inputRef: "snapshot-1",
      outputRef: "pdf-model-1",
      cases: [
        {
          metricId: "required-fact-preservation",
          caseId: "employment/1/organization",
          decision: "fail",
          evidence: [{ kind: "output_field", reference: "employment/1/title" }],
        },
        {
          metricId: "text-proofreading",
          caseId: "block-1",
          decision: "needs_review",
          evidence: [],
        },
      ],
    });

    expect(run).toMatchObject({
      schemaVersion: 1,
      domain: "resume",
      contractVersion: "1",
      caseSetVersion: "resume-quality-population-v1",
      policyVersion: "resume-quality-policy-v1",
    });
    expect(run.cases).toEqual([
      expect.objectContaining({
        metricId: "required-fact-preservation",
        ruleId: "source-fact-preserved",
        stage: "pdf",
        unit: "source_fact",
        blocking: true,
      }),
      expect.objectContaining({
        metricId: "text-proofreading",
        ruleId: "proofread-visible-text",
        unit: "visible_text_block",
        blocking: false,
      }),
    ]);
  });

  it("알 수 없는 이력서 지표 입력은 거절한다", () => {
    expect(() =>
      createResumeQualityEvaluation({
        evaluationId: "evaluation-1",
        evaluatedAt: "2026-11-06T00:00:00.000Z",
        inputRef: "snapshot-1",
        outputRef: "pdf-model-1",
        cases: [
          {
            metricId: "portfolio-score",
            caseId: "case-1",
            decision: "pass",
            evidence: [],
          },
        ],
      }),
    ).toThrow("UNKNOWN_RESUME_QUALITY_METRIC");
  });
});
