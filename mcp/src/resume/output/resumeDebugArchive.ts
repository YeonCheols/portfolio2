import { createHash, randomUUID } from "node:crypto";
import type { JsonStorage } from "@mcp/storage/supabaseStorage";
import type {
  ResumeGenerationScope,
  ResumeGenerationSnapshot,
} from "@mcp/resume/output/resumeGenerationStore";
import type { ResumeModelRequest } from "@mcp/resume/output/runResumeHarness";
import type { CheckedDraft } from "@mcp/resume/output/checkResumeDraft";
import { ResumeConnectionError } from "@mcp/resume/connection/shared/connection";

type DebugData = {
  snapshot?: ResumeGenerationSnapshot;
  request?: ResumeModelRequest;
  response?: string;
  validation?: Pick<
    CheckedDraft,
    "gaps" | "conflicts" | "uncertain" | "validationIssues"
  >;
  errorCode?: string;
};
type DebugStage =
  | "started"
  | "source"
  | "model_request"
  | "model_response"
  | "validation"
  | "pdf"
  | "completed"
  | "failed";

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
