import { resumeQualityPolicy } from "@mcp/modules/resume/quality/resume-quality-policy";

describe("resumeQualityPolicy", () => {
  it("이력서 지표의 모집단, 판정 기준, 미확인과 차단 정책을 고정한다", () => {
    expect(resumeQualityPolicy).toMatchObject({
      domain: "resume",
      contractVersion: "1",
      caseSetVersion: "resume-quality-population-v1",
      policyVersion: "resume-quality-policy-v1",
    });

    const metricIds = resumeQualityPolicy.metrics.map(
      ({ metricId }) => metricId,
    );
    expect(metricIds).toEqual([
      "required-fact-preservation",
      "required-item-coverage",
      "claim-support",
      "numeric-integrity",
      "duplicate-content",
      "text-proofreading",
      "pdf-layout",
    ]);
    expect(new Set(metricIds).size).toBe(metricIds.length);
    const ruleIds = resumeQualityPolicy.metrics.map(({ ruleId }) => ruleId);
    expect(new Set(ruleIds).size).toBe(ruleIds.length);
    expect(
      resumeQualityPolicy.metrics.every(
        ({
          ruleId,
          stage,
          unit,
          population,
          notApplicableWhen,
          passWhen,
          failWhen,
          needsReviewWhen,
          measurementFailedWhen,
          blockingDecisions,
        }) =>
          Boolean(
            ruleId &&
              stage &&
              unit &&
              population &&
              notApplicableWhen &&
              passWhen &&
              failWhen &&
              needsReviewWhen &&
              measurementFailedWhen &&
              Array.isArray(blockingDecisions),
          ),
      ),
    ).toBe(true);
  });

  it("필수 사실·필수 항목과 위험한 주장은 완료 차단 기준을 둔다", () => {
    const blockingMetrics = resumeQualityPolicy.metrics.filter((metric) =>
      metric.blockingDecisions.includes("fail"),
    );

    expect(blockingMetrics.map(({ metricId }) => metricId)).toEqual([
      "required-fact-preservation",
      "required-item-coverage",
      "claim-support",
      "numeric-integrity",
      "pdf-layout",
    ]);
  });
});
