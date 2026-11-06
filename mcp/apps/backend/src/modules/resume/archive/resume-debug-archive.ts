import { createHash, randomUUID } from "node:crypto";
import type { CheckedDraft } from "@mcp/modules/resume/validation/check-resume-draft";
import type {
  ResumeGenerationScope,
  ResumeGenerationSnapshot,
} from "@mcp/modules/resume/generation/resume-generation-store";
import type { ResumeModelRequest } from "@mcp/modules/resume/generation/run-resume-harness";
import type { ResumeModelInfo } from "@mcp/modules/resume/generation/run-resume-harness";
import type { ResumeQualityEvaluation } from "@mcp/modules/resume/quality/evaluate-resume-pdf";
import type { JsonStorage } from "@mcp/infrastructure/storage/supabase-storage";
import { ResumeConnectionError } from "@mcp/infrastructure/connection/connection";

type DebugData = {
  snapshot?: ResumeGenerationSnapshot;
  request?: ResumeModelRequest;
  response?: string;
  model?: ResumeModelInfo;
  validation?: Pick<
    CheckedDraft,
    "gaps" | "conflicts" | "uncertain" | "validationIssues" | "diagnostics"
  > & { status?: "passed" | "blocked" };
  qualityEvaluation?: ResumeQualityEvaluation;
  errorCode?: string;
};
export const resumeDebugStages = [
  "started",
  "source",
  "model_request",
  "model_response",
  "validation",
  "quality_evaluation",
  "pdf",
  "completed",
  "failed",
] as const;
type DebugStage = (typeof resumeDebugStages)[number];

export const createResumeDebugAttempt = (
  storage: JsonStorage,
  scope: ResumeGenerationScope,
  generationId: string,
  operation: "generate_resume" | "convert_resume_to_pdf",
) => {
  const subjectHash = createHash("sha256").update(scope.subject).digest("hex");
  const attemptId = randomUUID();
  const prefix = `debug/resume/${scope.environment}/${subjectHash}/${generationId}/${attemptId}`;
  let sequence = 0;
  let lastStage: DebugStage | undefined;
  let state: DebugData = {};
  return {
    write: async (stage: DebugStage, data: DebugData = {}): Promise<void> => {
      state = { ...state, ...structuredClone(data) };
      const record = {
        schemaVersion: 1,
        generationId,
        attemptId,
        operation,
        environment: scope.environment,
        subjectHash,
        stage,
        createdAt: new Date().toISOString(),
        ...state,
        ...(stage === "failed" ? { failedAfter: lastStage } : {}),
      };
      try {
        await storage.putJson(
          `${prefix}/${String(++sequence).padStart(3, "0")}-${stage}.json`,
          record,
        );
        lastStage = stage;
      } catch {
        throw new ResumeConnectionError("DEBUG_STORAGE_FAILED");
      }
    },
  };
};
