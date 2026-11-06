import { randomUUID } from "node:crypto";

import { ResumeConnectionError } from "@mcp/infrastructure/connection/connection";
import { assertResumePdfReady } from "@mcp/modules/resume/validation/assert-resume-pdf-ready";
import type { ResumeSelectionNode } from "@mcp/modules/resume/validation/check-resume-draft";
import { createResumePdf } from "@mcp/modules/resume/render/create-resume-pdf";
import { evaluateResumePdfQuality } from "@mcp/modules/resume/quality/evaluate-resume-pdf";
import { assertResumePdfQualityReady } from "@mcp/modules/resume/quality/assert-resume-pdf-quality-ready";
import type { ResumeQualityEvaluation } from "@mcp/modules/resume/quality/evaluate-resume-pdf";
import {
  archiveDirectory,
  ArchiveQueryError,
  createResumeDebugArchiveReader,
  listAllObjects,
  type ArchiveKey,
} from "@mcp/modules/resume/archive/resume-debug-archive-reader";
import {
  createResumeDebugArchiveWriter,
  type ArchiveWriteStorage,
} from "@mcp/modules/resume/archive/resume-debug-archive-writer";
import {
  completeResumeGeneration,
  type GeneratedResume,
} from "@mcp/modules/resume/generation/run-resume-harness";

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
    qualityEvaluation?: ResumeQualityEvaluation;
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
// 같은 재현을 한 번에 하나만 실행하게 하는 잠금이 살아 있는 최대 시간. 중단된 실행의 잠금이 영구히 남지 않게 한다
const lockTtlMs = 120_000;
const lockIdPattern = /^[A-Za-z0-9_-]{1,128}$/;

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
  // 같은 실행·원본·동작의 중복 실행을 Storage의 잠금 객체로 막아 인스턴스가 여럿이어도 유효하다.
  // 같은 경로에는 다시 쓸 수 없다는 Storage의 성질을 이용하고, 오래된 잠금은 치운다
  const acquireLock = async (path: string): Promise<void> => {
    const lock = {
      schemaVersion: 1,
      kind: "lock",
      createdAt: new Date().toISOString(),
    };
    try {
      await storage.putJson(path, lock);
      return;
    } catch (writeError) {
      // 이미 있음이 아니라 저장소 오류이면 잠겨 있는 것이 아니므로 그 오류를 그대로 전한다
      if ((writeError as { code?: unknown }).code !== "STORAGE_OBJECT_EXISTS")
        throw writeError;
    }
    // 다른 요청이 잠금을 잡았다. 읽기 전에 그 요청이 끝나 잠금이 풀렸어도 이쪽과 겹친 요청이므로 실행 중으로 본다
    let existing: unknown;
    try {
      existing = await storage.getJson(path);
    } catch {
      throw new ArchiveBusyError();
    }
    const createdAt = isRecord(existing)
      ? Date.parse(String(existing.createdAt))
      : Number.NaN;
    if (Number.isFinite(createdAt) && Date.now() - createdAt < lockTtlMs)
      throw new ArchiveBusyError();
    // 만료됐거나 깨진 잠금은 치우고 한 번만 다시 잡는다. 그사이 다른 인스턴스가 잡았으면 실행 중이다
    await storage.removeObjects([path]);
    try {
      await storage.putJson(path, lock);
    } catch {
      throw new ArchiveBusyError();
    }
  };
  const releaseLock = async (path: string): Promise<void> => {
    try {
      await storage.removeObjects([path]);
    } catch {
      // 풀지 못해도 재현 결과는 이미 정해졌다. 잠금은 만료 시간이 지나면 다음 요청이 치운다
    }
  };

  const run = async (
    selection: unknown,
    response: unknown,
    action: ReproductionAction,
    inputRef: string,
    outputRef: string,
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
    let qualityEvaluation: ResumeQualityEvaluation | undefined;
    try {
      assertResumePdfReady(generated);
      qualityEvaluation = evaluateResumePdfQuality({
        generated,
        evaluationId: randomUUID(),
        evaluatedAt: new Date().toISOString(),
        inputRef,
        outputRef,
      });
      assertResumePdfQualityReady(qualityEvaluation);
      const pdf = await createResumePdf({
        resume: generated.resume,
        claims: generated.claims,
        selection: generated.selection,
      });
      return {
        outcome: {
          status: "completed",
          validation: { ...validation, qualityEvaluation },
          pdf: { byteLength: pdf.length },
        },
        pdf,
      };
    } catch (error) {
      return {
        outcome: failure("pdf", codeOf(error, "PDF_GENERATION_FAILED"), {
          ...validation,
          ...(qualityEvaluation ? { qualityEvaluation } : {}),
        }),
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
      if (source.kind === "revision" && !lockIdPattern.test(source.revisionId))
        throw new ArchiveQueryError();
      const detail = await reader.get(key);
      const latest = isRecord(detail.latest) ? detail.latest : {};
      const snapshot = isRecord(latest.snapshot) ? latest.snapshot : {};
      let response: unknown = latest.response;
      if (source.kind === "revision") {
        const revision = await writer.getRevision(key, source.revisionId);
        response = isRecord(revision) ? revision.response : undefined;
      }
      // 대상이 있는 것을 확인한 뒤에만 잠그므로 없는 실행에 잠금 객체가 생기지 않는다
      const lockPath = `${directory}/locks/${
        source.kind === "revision" ? source.revisionId : "original"
      }-${action}.json`;
      await acquireLock(lockPath);
      try {
        const { outcome, pdf } = await run(
          snapshot.selection,
          response,
          action,
          key.generationId,
          `${source.kind}/${source.kind === "revision" ? source.revisionId : "original"}/${action}`,
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
        await releaseLock(lockPath);
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
