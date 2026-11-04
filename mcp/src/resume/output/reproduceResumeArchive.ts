import { randomUUID } from "node:crypto";

import { ResumeConnectionError } from "@mcp/resume/connection/shared/connection";
import { assertResumePdfReady } from "@mcp/resume/output/assertResumePdfReady";
import type { ResumeSelectionNode } from "@mcp/resume/output/checkResumeDraft";
import { createResumePdf } from "@mcp/resume/output/createResumePdf";
import {
  archiveDirectory,
  ArchiveQueryError,
  createResumeDebugArchiveReader,
  listAllObjects,
  type ArchiveKey,
} from "@mcp/resume/output/resumeDebugArchiveReader";
import {
  createResumeDebugArchiveWriter,
  type ArchiveWriteStorage,
} from "@mcp/resume/output/resumeDebugArchiveWriter";
import {
  completeResumeGeneration,
  type GeneratedResume,
} from "@mcp/resume/output/runResumeHarness";

export type ReproductionSource =
  | { kind: "original" }
  | { kind: "revision"; revisionId: string };
export type ReproductionAction = "validate" | "pdf";
export type ReproductionStage = "snapshot" | "response" | "validation" | "pdf";

export type ReproductionRecord = {
  schemaVersion: 1;
  kind: "reproduction";
  reproductionId: string;
  createdAt: string;
  environment: string;
  subjectHash: string;
  generationId: string;
  attemptId: string;
  source: ReproductionSource;
  action: ReproductionAction;
  status: "completed" | "failed";
  failedStage?: ReproductionStage;
  errorCode?: string;
  validation?: {
    claims: number;
    gaps: number;
    conflicts: number;
    uncertain: number;
    issues: readonly unknown[];
  };
  pdf?: { byteLength: number };
};

export class ArchiveBusyError extends Error {
  readonly code = "REPRODUCTION_IN_PROGRESS";
  constructor() {
    super("REPRODUCTION_IN_PROGRESS");
    this.name = "ArchiveBusyError";
  }
}

const maxListed = 50;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

type Outcome = Pick<
  ReproductionRecord,
  "status" | "failedStage" | "errorCode" | "validation" | "pdf"
>;

const failure = (
  failedStage: ReproductionStage,
  errorCode: string,
  validation?: ReproductionRecord["validation"],
): Outcome => ({
  status: "failed",
  failedStage,
  errorCode,
  ...(validation ? { validation } : {}),
});

const codeOf = (error: unknown, fallback: string): string =>
  error instanceof ResumeConnectionError ? error.code : fallback;

// 보관된 스냅샷과 응답만으로 내부 검증과 PDF 생성을 다시 한다. 모델 클라이언트나 원문 API를 받지 않는다
export const createResumeArchiveReproducer = (storage: ArchiveWriteStorage) => {
  const reader = createResumeDebugArchiveReader(storage);
  const writer = createResumeDebugArchiveWriter(storage);
  // 같은 실행·원본·동작의 중복 실행을 막는다. 이 프로세스 안에서만 유효하다
  const running = new Set<string>();

  const run = async (
    selection: unknown,
    response: unknown,
    action: ReproductionAction,
  ): Promise<{ outcome: Outcome; pdf?: Buffer }> => {
    if (!Array.isArray(selection))
      return { outcome: failure("snapshot", "SNAPSHOT_MISSING") };
    if (typeof response !== "string")
      return { outcome: failure("response", "RESPONSE_MISSING") };
    let generated: GeneratedResume;
    try {
      generated = completeResumeGeneration(
        selection as ResumeSelectionNode[],
        response,
      );
    } catch (error) {
      return {
        outcome: failure("validation", codeOf(error, "VALIDATION_FAILED")),
      };
    }
    const validation = {
      claims: generated.claims.length,
      gaps: generated.gaps.length,
      conflicts: generated.conflicts.length,
      uncertain: generated.uncertain.length,
      issues: generated.validationIssues,
    };
    if (action === "validate")
      return { outcome: { status: "completed", validation } };
    try {
      assertResumePdfReady(generated);
      const pdf = await createResumePdf({
        resume: generated.resume,
        claims: generated.claims,
        selection: generated.selection,
      });
      return {
        outcome: {
          status: "completed",
          validation,
          pdf: { byteLength: pdf.length },
        },
        pdf,
      };
    } catch (error) {
      return {
        outcome: failure(
          "pdf",
          codeOf(error, "PDF_GENERATION_FAILED"),
          validation,
        ),
      };
    }
  };

  return {
    reproduce: async (
      key: ArchiveKey,
      input: { source: ReproductionSource; action: ReproductionAction },
    ): Promise<{ record: ReproductionRecord; pdf?: Buffer }> => {
      const directory = archiveDirectory(key);
      const { source, action } = input;
      if (
        (action !== "validate" && action !== "pdf") ||
        (source.kind !== "original" && source.kind !== "revision")
      )
        throw new ArchiveQueryError();
      const lockKey = [
        directory,
        source.kind === "revision" ? source.revisionId : "original",
        action,
      ].join("|");
      if (running.has(lockKey)) throw new ArchiveBusyError();
      running.add(lockKey);
      try {
        const detail = await reader.get(key);
        const latest = isRecord(detail.latest) ? detail.latest : {};
        const snapshot = isRecord(latest.snapshot) ? latest.snapshot : {};
        let response: unknown = latest.response;
        if (source.kind === "revision") {
          const revision = await writer.getRevision(key, source.revisionId);
          response = isRecord(revision) ? revision.response : undefined;
        }
        const { outcome, pdf } = await run(
          snapshot.selection,
          response,
          action,
        );
        const record: ReproductionRecord = {
          schemaVersion: 1,
          kind: "reproduction",
          reproductionId: randomUUID(),
          createdAt: new Date().toISOString(),
          environment: key.environment,
          subjectHash: key.subjectHash,
          generationId: key.generationId,
          attemptId: key.attemptId,
          source,
          action,
          ...outcome,
        };
        await storage.putJson(
          `${directory}/reproductions/${record.reproductionId}.json`,
          record,
        );
        return { record, ...(pdf ? { pdf } : {}) };
      } finally {
        running.delete(lockKey);
      }
    },
    listReproductions: async (
      key: ArchiveKey,
    ): Promise<ReproductionRecord[]> => {
      const directory = archiveDirectory(key);
      const entries = (
        await listAllObjects(storage, `${directory}/reproductions`)
      )
        .filter(
          (entry) =>
            entry.kind === "file" && /^[A-Za-z0-9_-]+\.json$/.test(entry.name),
        )
        .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""))
        .slice(0, maxListed);
      const records = await Promise.all(
        entries.map((entry) =>
          storage.getJson(`${directory}/reproductions/${entry.name}`),
        ),
      );
      return records.filter(isRecord) as unknown as ReproductionRecord[];
    },
  };
};
