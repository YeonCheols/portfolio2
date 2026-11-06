import type { GeneratedResume } from "@mcp/modules/resume/generation/run-resume-harness";
import { aggregateMetricCases } from "@mcp/modules/quality-evaluation/evaluation-calculations";
import type {
  MetricEvaluationAggregate,
  QualityEvaluationRun,
} from "@mcp/modules/quality-evaluation/evaluation-contract";
import { createResumeQualityEvaluation } from "@mcp/modules/resume/quality/create-resume-quality-evaluation";
import { resumeQualityPolicy } from "@mcp/modules/resume/quality/resume-quality-policy";

export type ResumeQualityEvaluation = {
  run: QualityEvaluationRun;
  aggregates: readonly MetricEvaluationAggregate[];
};

export type EvaluateResumePdfQualityInput = {
  generated: Pick<GeneratedResume, "resume" | "claims" | "selection">;
  evaluationId: string;
  evaluatedAt: string;
  inputRef: string;
  outputRef: string;
};

/** Builds conservative output-derived cases; semantic checks remain human-owned. */
export const evaluateResumePdfQuality = (
  input: EvaluateResumePdfQualityInput,
): ResumeQualityEvaluation => {
  const cases = input.generated.claims.flatMap((claim, claimIndex) => {
    const claimId = `claim/${claimIndex}`;
    const evidence = [...new Set(claim.sourceIds)].map((reference) => ({
      kind: "source_fact",
      reference,
    }));
    const claimCase = {
      metricId: "claim-support",
      caseId: claimId,
      decision: "needs_review" as const,
      evidence: [...evidence, { kind: "output_claim", reference: claimId }],
      reasonCode: "SEMANTIC_SUPPORT_REQUIRES_REVIEW",
    };
    const numericCases = [...claim.text.matchAll(/\d+(?:[.,]\d+)?/gu)].map(
      (match, numericIndex) => ({
        metricId: "numeric-integrity",
        caseId: `numeric/${claimIndex}/${numericIndex}/${match[0]}`,
        decision: "needs_review" as const,
        evidence: [
          ...evidence,
          {
            kind: "output_numeric_assertion",
            reference: `claim/${claimIndex}/number/${numericIndex}`,
          },
        ],
        reasonCode: "NUMERIC_ASSERTION_REQUIRES_VALUE_UNIT_ATTRIBUTION_REVIEW",
      }),
    );
    return [claimCase, ...numericCases];
  });

  const run = createResumeQualityEvaluation({ ...input, cases });
  const aggregates = resumeQualityPolicy.metrics.map((metric) =>
    aggregateMetricCases(run, {
      metricId: metric.metricId,
      stage: metric.stage,
      populationMode: metric.populationMode,
      unit: metric.unit,
    }),
  );

  return { run, aggregates };
};
