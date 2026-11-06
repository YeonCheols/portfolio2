import { resumeQualityPolicy } from "@mcp/modules/resume/quality/resume-quality-policy";

describe("resumeQualityPolicy", () => {
  it("이력서 지표의 모집단, 판정 기준, 미확인과 차단 정책을 고정한다", () => {
    expect(resumeQualityPolicy).toMatchObject({
      domain: "resume",
      contractVersion: "1",
      caseSetVersion: "resume-quality-population-v1",
      policyVersion: "resume-quality-policy-v2",
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

  it("모든 품질 지표의 명시적 실패는 완료를 차단한다", () => {
    const blockingMetrics = resumeQualityPolicy.metrics.filter((metric) =>
      metric.blockingDecisions.includes("fail"),
    );

    expect(blockingMetrics.map(({ metricId }) => metricId)).toEqual([
      "required-fact-preservation",
      "required-item-coverage",
      "claim-support",
      "numeric-integrity",
      "duplicate-content",
      "text-proofreading",
      "pdf-layout",
    ]);
  });

  it("사람 검토 대기는 허용하고 실패와 측정 불가만 차단한다", () => {
    expect(
      resumeQualityPolicy.metrics.map(({ metricId, blockingDecisions }) => ({
        metricId,
        blockingDecisions,
      })),
    ).toEqual(
      resumeQualityPolicy.metrics.map(({ metricId }) => ({
        metricId,
        blockingDecisions: ["fail", "measurement_failed"],
      })),
    );
  });
});
