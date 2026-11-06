import { aggregateMetricCases } from "@mcp/modules/quality-evaluation/evaluation-calculations";
import type { EvaluationDecision } from "@mcp/modules/quality-evaluation/evaluation-contract";
import type { ResumeQualityEvaluation } from "@mcp/modules/resume/quality/evaluate-resume-pdf";
import { resumeQualityPolicy } from "@mcp/modules/resume/quality/resume-quality-policy";

export type ResumeQualityReview = {
  reviewId: string;
  evaluationId: string;
  caseSetVersion: string;
  policyVersion: string;
  inputRef: string;
  outputRef: string;
  caseId: string;
  decision: Extract<EvaluationDecision, "pass" | "fail">;
  reviewedAt: string;
  reviewerHash: string;
};

export const applyResumeQualityReviews = (
  evaluation: ResumeQualityEvaluation,
  reviews: readonly ResumeQualityReview[],
): ResumeQualityEvaluation => {
  const current = evaluation.run;
  const applicable = new Map<string, ResumeQualityReview>();
  reviews
    .filter(
      (review) =>
        review.evaluationId === current.evaluationId &&
        review.caseSetVersion === current.caseSetVersion &&
        review.policyVersion === current.policyVersion &&
        review.inputRef === current.inputRef &&
        review.outputRef === current.outputRef,
    )
    .sort(
      (left, right) =>
        left.reviewedAt.localeCompare(right.reviewedAt) ||
        left.reviewerHash.localeCompare(right.reviewerHash),
    )
    .forEach((review) => applicable.set(review.caseId, review));

  const appliedReviews: ResumeQualityReview[] = [];
  const cases = current.cases.map((result) => {
    const review = applicable.get(result.caseId);
    if (result.decision !== "needs_review" || !review) return result;
    appliedReviews.push(review);
    const blockingDecisions =
      resumeQualityPolicy.metrics.find(
        ({ metricId }) => metricId === result.metricId,
      )?.blockingDecisions ?? [];
    return {
      ...result,
      decision: review.decision,
      blocking: (blockingDecisions as readonly string[]).includes(
        review.decision,
      ),
      reasonCode:
        review.decision === "pass"
          ? "HUMAN_REVIEW_PASSED"
          : "HUMAN_REVIEW_FAILED",
    };
  });
  const run = { ...current, cases };
  const aggregates = resumeQualityPolicy.metrics.map((metric) =>
    aggregateMetricCases(run, {
      metricId: metric.metricId,
      stage: metric.stage,
      populationMode: metric.populationMode,
      unit: metric.unit,
    }),
  );

  return {
    ...evaluation,
    run,
    aggregates,
    ...(appliedReviews.length > 0 ? { manualReviews: appliedReviews } : {}),
  };
};
