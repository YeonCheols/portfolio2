import { randomUUID } from "node:crypto";

import type { ResumeSelectionNode } from "@mcp/modules/resume/validation/check-resume-draft";
import type {
  ResumeFormSection,
  ResumeModelRequest,
  ResumeModelInfo,
} from "@mcp/modules/resume/generation/run-resume-harness";
import type { JsonStorage } from "@mcp/infrastructure/storage/supabase-storage";
import type { ResumeQualityReview } from "@mcp/modules/resume/quality/apply-resume-quality-reviews";
import type { QualityEvaluationRun } from "@mcp/modules/quality-evaluation/evaluation-contract";
import { ResumeConnectionError } from "@mcp/infrastructure/connection/connection";

export type ResumeGenerationScope = { subject: string; environment: string };
export type ResumeGenerationSnapshot = {
  selection: readonly ResumeSelectionNode[];
  forms: readonly ResumeFormSection[];
};
export type StoredResumeGeneration = {
  id: string;
  snapshot?: ResumeGenerationSnapshot;
  request?: ResumeModelRequest;
  response?: string;
  model?: ResumeModelInfo;
};

export const createResumeGenerationStore = () => {
  const entries = new Map<string, StoredResumeGeneration>();
  const key = (scope: ResumeGenerationScope) =>
    JSON.stringify([scope.subject, scope.environment]);
  const current = (
    scope: ResumeGenerationScope,
    id: string,
  ): StoredResumeGeneration => {
    const entry = entries.get(key(scope));
    if (!entry || entry.id !== id)
      throw new ResumeConnectionError("GENERATION_NOT_FOUND");
    return entry;
  };
  return {
    begin: (scope: ResumeGenerationScope): string => {
      const id = randomUUID();
      entries.set(key(scope), { id });
      return id;
    },
    snapshot: (
      scope: ResumeGenerationScope,
      id: string,
      snapshot: ResumeGenerationSnapshot,
    ): void => {
      const entry = current(scope, id);
      if (entry.snapshot)
        throw new ResumeConnectionError("GENERATION_SNAPSHOT_EXISTS");
      entry.snapshot = structuredClone(snapshot);
    },
    capture: (
      scope: ResumeGenerationScope,
      id: string,
      request: ResumeModelRequest | undefined,
      response: string,
    ): void => {
      const entry = current(scope, id);
      if (entry.response !== undefined)
        throw new ResumeConnectionError("GENERATION_RESPONSE_EXISTS");
      if (request) entry.request = structuredClone(request);
      entry.response = response;
    },
    captureModel: (
      scope: ResumeGenerationScope,
      id: string,
      model: ResumeModelInfo,
    ): void => {
      const entry = current(scope, id);
      if (entry.model)
        throw new ResumeConnectionError("GENERATION_MODEL_EXISTS");
      entry.model = { provider: model.provider, modelName: model.modelName };
    },
    read: (scope: ResumeGenerationScope, id: string): StoredResumeGeneration =>
      structuredClone(current(scope, id)),
    assertCurrent: (scope: ResumeGenerationScope, id: string): void => {
      current(scope, id);
    },
  };
};

export type ResumeGenerationContext = {
  store: ReturnType<typeof createResumeGenerationStore>;
  scope: ResumeGenerationScope;
  storage?: JsonStorage;
  qualityReviews?: {
    load: (input: {
      environment: string;
      subject: string;
      generationId: string;
      evaluation: QualityEvaluationRun;
    }) => Promise<ResumeQualityReview[]>;
  };
};
