import { randomUUID } from "node:crypto";

import { ResumeConnectionError } from "@mcp/resume/connection/shared/connection";
import type { ResumeSelectionNode } from "@mcp/resume/output/checkResumeDraft";
import {
  archiveDirectory,
  ArchiveNotFoundError,
  ArchiveQueryError,
  createResumeDebugArchiveReader,
  listAllObjects,
  type ArchiveKey,
  type ArchiveReadStorage,
} from "@mcp/resume/output/resumeDebugArchiveReader";
import {
  parseClaims,
  sourceElementIdsOf,
} from "@mcp/resume/output/runResumeHarness";

export type ArchiveWriteStorage = ArchiveReadStorage & {
  putJson: (path: string, value: unknown) => Promise<void>;
  removeObjects: (paths: string[]) => Promise<string[]>;
};

export type ArchiveRevisionErrorCode =
  | "INVALID_RESPONSE"
  | "RESPONSE_TOO_LARGE"
  | "UNKNOWN_SOURCE_REF"
  | "INVALID_REQUEST_PAYLOAD"
  | "INVALID_BASE_FILE"
  | "SNAPSHOT_MISSING";

// 입력이 수정본 조건에 맞지 않을 때 던진다. 코드만 노출하고 입력 내용은 담지 않는다
export class ArchiveRevisionError extends Error {
  constructor(public readonly code: ArchiveRevisionErrorCode) {
    super(code);
    this.name = "ArchiveRevisionError";
  }
}

const maxResponseChars = 1_000_000;
// 실행 폴더 아래 revisions·reproductions와 그 하위 한 단계까지만 내려간다
const maxDeleteDepth = 2;
const revisionIdPattern = /^[A-Za-z0-9_-]{1,128}$/;

export type RevisionInput = {
  baseFile: string;
  request?: unknown;
  response: string;
};

export type RevisionSummary = { revisionId: string; createdAt?: string };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const snapshotSelection = (latest: unknown): ResumeSelectionNode[] => {
  const snapshot = isRecord(latest) ? latest.snapshot : undefined;
  if (!isRecord(snapshot) || !Array.isArray(snapshot.selection))
    throw new ArchiveRevisionError("SNAPSHOT_MISSING");
  return snapshot.selection as ResumeSelectionNode[];
};

const referencedSourceIds = (response: string): string[] => {
  try {
    return parseClaims(response).flatMap((claim) => [
      ...claim.sourceIds,
      ...(claim.evidence ?? []).map((item) => item.sourceId),
    ]);
  } catch (error) {
    if (error instanceof ResumeConnectionError)
      throw new ArchiveRevisionError("INVALID_RESPONSE");
    throw error;
  }
};

export class ArchiveDeleteError extends Error {
  constructor(
    public readonly code: "CONFIRMATION_MISMATCH" | "DELETE_PARTIAL",
    public readonly removed = 0,
    public readonly remaining = 0,
  ) {
    super(code);
    this.name = "ArchiveDeleteError";
  }
}

export const createResumeDebugArchiveWriter = (
  storage: ArchiveWriteStorage,
) => {
  const reader = createResumeDebugArchiveReader(storage);
  const listRevisions = async (key: ArchiveKey): Promise<RevisionSummary[]> => {
    const entries = await listAllObjects(
      storage,
      `${archiveDirectory(key)}/revisions`,
    );
    return entries
      .flatMap((entry): RevisionSummary[] => {
        const id =
          entry.kind === "file" && entry.name.match(/^(.+)\.json$/)?.[1];
        return id && revisionIdPattern.test(id)
          ? [
              {
                revisionId: id,
                ...(entry.createdAt ? { createdAt: entry.createdAt } : {}),
              },
            ]
          : [];
      })
      .sort(
        (a, b) =>
          (b.createdAt ?? "").localeCompare(a.createdAt ?? "") ||
          a.revisionId.localeCompare(b.revisionId),
      );
  };
  return {
    // 확인 값이 대상 실행 ID와 같을 때만, 그 실행 폴더 안의 모든 객체를 지운다
    removeAttempt: async (
      key: ArchiveKey,
      confirm: string,
    ): Promise<{ removed: number }> => {
      const directory = archiveDirectory(key);
      if (confirm !== key.attemptId)
        throw new ArchiveDeleteError("CONFIRMATION_MISMATCH");
      const paths: string[] = [];
      // 깊이 제한 때문에 열지 못한 폴더 수. 안의 객체가 남을 수 있어 남은 항목으로 센다
      let unreached = 0;
      const collect = async (prefix: string, depth: number): Promise<void> => {
        for (const entry of await listAllObjects(storage, prefix)) {
          if (entry.kind === "file") paths.push(`${prefix}/${entry.name}`);
          else if (depth < maxDeleteDepth)
            await collect(`${prefix}/${entry.name}`, depth + 1);
          else unreached += 1;
        }
      };
      await collect(directory, 0);
      if (paths.length === 0) throw new ArchiveNotFoundError();
      const removed = new Set(await storage.removeObjects(paths));
      const remaining =
        paths.filter((path) => !removed.has(path)).length + unreached;
      // 저장소가 지웠다고 알린 객체만 센다. 하나라도 남으면 성공으로 보고하지 않는다
      if (remaining > 0)
        throw new ArchiveDeleteError("DELETE_PARTIAL", removed.size, remaining);
      return { removed: paths.length };
    },
    listRevisions,
    getRevision: async (
      key: ArchiveKey,
      revisionId: string,
    ): Promise<unknown> => {
      const directory = archiveDirectory(key);
      if (!revisionIdPattern.test(revisionId)) throw new ArchiveQueryError();
      if (!(await listRevisions(key)).some((r) => r.revisionId === revisionId))
        throw new ArchiveNotFoundError();
      return storage.getJson(`${directory}/revisions/${revisionId}.json`);
    },
    // 원본 단계 파일은 건드리지 않고 항상 새 객체로만 저장한다
    saveRevision: async (
      key: ArchiveKey,
      input: RevisionInput,
    ): Promise<{ revisionId: string }> => {
      const directory = archiveDirectory(key);
      if (typeof input.response !== "string")
        throw new ArchiveRevisionError("INVALID_RESPONSE");
      if (input.response.length > maxResponseChars)
        throw new ArchiveRevisionError("RESPONSE_TOO_LARGE");
      const detail = await reader.get(key);
      if (!detail.files.some((file) => file.name === input.baseFile))
        throw new ArchiveRevisionError("INVALID_BASE_FILE");
      const selection = snapshotSelection(detail.latest);
      if (
        input.request !== undefined &&
        !(
          isRecord(input.request) &&
          typeof input.request.persona === "string" &&
          typeof input.request.prompt === "string"
        )
      )
        throw new ArchiveRevisionError("INVALID_REQUEST_PAYLOAD");
      const known = new Set(sourceElementIdsOf(selection));
      if (!referencedSourceIds(input.response).every((id) => known.has(id)))
        throw new ArchiveRevisionError("UNKNOWN_SOURCE_REF");

      const revisionId = randomUUID();
      await storage.putJson(`${directory}/revisions/${revisionId}.json`, {
        schemaVersion: 1,
        kind: "revision",
        revisionId,
        createdAt: new Date().toISOString(),
        environment: key.environment,
        subjectHash: key.subjectHash,
        generationId: key.generationId,
        attemptId: key.attemptId,
        base: { file: input.baseFile },
        ...(input.request !== undefined ? { request: input.request } : {}),
        response: input.response,
      });
      return { revisionId };
    },
  };
};
