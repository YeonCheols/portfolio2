import type {
  EvaluationDecision,
  EvaluationEvidenceReference,
  QualityEvaluationRun,
} from "@mcp/modules/quality-evaluation/evaluation-contract";
import { resumeQualityPolicy } from "@mcp/modules/resume/quality/resume-quality-policy";

export type ResumeQualityCaseInput = {
  metricId: string;
  caseId: string;
  decision: EvaluationDecision;
  evidence: readonly EvaluationEvidenceReference[];
  reasonCode?: string;
};

export type CreateResumeQualityEvaluationInput = {
  evaluationId: string;
  evaluatedAt: string;
  inputRef: string;
  outputRef: string;
  cases: readonly ResumeQualityCaseInput[];
};

/** Adds resume-owned rules to domain-neutral evaluation results. */
export const createResumeQualityEvaluation = (
  input: CreateResumeQualityEvaluationInput,
): QualityEvaluationRun => ({
  schemaVersion: 1,
  evaluationId: input.evaluationId,
  evaluatedAt: input.evaluatedAt,
  domain: resumeQualityPolicy.domain,
  contractVersion: resumeQualityPolicy.contractVersion,
  caseSetVersion: resumeQualityPolicy.caseSetVersion,
  policyVersion: resumeQualityPolicy.policyVersion,
  inputRef: input.inputRef,
  outputRef: input.outputRef,
  cases: input.cases.map((result) => {
    const metric = resumeQualityPolicy.metrics.find(
      ({ metricId }) => metricId === result.metricId,
    );
    if (!metric) throw new Error("UNKNOWN_RESUME_QUALITY_METRIC");
    return {
      metricId: metric.metricId,
      ruleId: metric.ruleId,
      stage: metric.stage,
      caseId: result.caseId,
      unit: metric.unit,
      decision: result.decision,
      blocking: metric.blockingDecisions.some(
        (decision) => decision === result.decision,
      ),
      evidence: result.evidence,
      ...(result.reasonCode ? { reasonCode: result.reasonCode } : {}),
    };
  }),
});
