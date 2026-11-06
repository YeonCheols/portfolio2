import { assertResumePdfQualityReady } from "@mcp/modules/resume/quality/assert-resume-pdf-quality-ready";
import type { ResumeQualityEvaluation } from "@mcp/modules/resume/quality/evaluate-resume-pdf";

const evaluation = (blockingCases: number): ResumeQualityEvaluation => ({
  run: {
    schemaVersion: 1,
    evaluationId: "evaluation-1",
    evaluatedAt: "2026-11-06T00:00:00.000Z",
    domain: "resume",
    contractVersion: "1",
    caseSetVersion: "resume-quality-population-v1",
    policyVersion: "resume-quality-policy-v1",
    inputRef: "snapshot-1",
    outputRef: "pdf-1",
    cases: [],
  },
  aggregates: [
    {
      evaluationId: "evaluation-1",
      evaluatedAt: "2026-11-06T00:00:00.000Z",
      domain: "resume",
      contractVersion: "1",
      caseSetVersion: "resume-quality-population-v1",
      policyVersion: "resume-quality-policy-v1",
      inputRef: "snapshot-1",
      outputRef: "pdf-1",
      metricId: "claim-support",
      ruleIds: ["claim-evidence"],
      stage: "pdf",
      populationMode: "output_derived",
      unit: "output_claim",
      caseIds: ["claim/0"],
      passedCases: 0,
      failedCases: 0,
      needsReviewCases: blockingCases,
      measurementFailedCases: 0,
      unknownCases: blockingCases,
      notApplicableCases: 0,
      numerator: 0,
      denominator: 1,
      lowerBound: 0,
      upperBound: 1,
      completionRate: 0,
      confirmedRate: null,
      blockingCases,
    },
  ],
});

describe("assertResumePdfQualityReady", () => {
  it("정책상 차단할 평가 케이스가 있으면 PDF 완료를 거절한다", () => {
    expect(() => assertResumePdfQualityReady(evaluation(1))).toThrow(
      "RESUME_QUALITY_BLOCKED",
    );
  });

  it("정책상 차단할 평가 케이스가 없으면 PDF 완료를 허용한다", () => {
    expect(() => assertResumePdfQualityReady(evaluation(0))).not.toThrow();
  });
});
