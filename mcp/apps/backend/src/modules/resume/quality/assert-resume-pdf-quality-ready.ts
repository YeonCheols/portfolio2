import { ResumeConnectionError } from "@mcp/infrastructure/connection/connection";
import type { ResumeQualityEvaluation } from "@mcp/modules/resume/quality/evaluate-resume-pdf";

export const assertResumePdfQualityReady = (
  evaluation: ResumeQualityEvaluation,
): void => {
  if (evaluation.aggregates.some(({ blockingCases }) => blockingCases > 0)) {
    throw new ResumeConnectionError("RESUME_QUALITY_BLOCKED");
  }
};
