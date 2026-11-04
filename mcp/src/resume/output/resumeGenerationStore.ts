import { randomUUID } from "node:crypto";
import type { JsonStorage } from "@mcp/storage/supabaseStorage";

import type { ResumeSelectionNode } from "@mcp/resume/output/checkResumeDraft";
import type {
  ResumeFormSection,
  ResumeModelRequest,
} from "@mcp/resume/output/runResumeHarness";
import { ResumeConnectionError } from "@mcp/resume/connection/shared/connection";

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
};
