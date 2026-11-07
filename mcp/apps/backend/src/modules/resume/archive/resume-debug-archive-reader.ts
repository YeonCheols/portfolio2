import { resumeDebugStages } from "@mcp/modules/resume/archive/resume-debug-archive";
import type { StorageEntry } from "@mcp/infrastructure/storage/supabase-storage";

export type ArchiveListStorage = {
  listObjects: (
    prefix: string,
    page: { limit: number; offset: number },
  ) => Promise<StorageEntry[]>;
};

export type ArchiveReadStorage = ArchiveListStorage & {
  getJson: (path: string) => Promise<unknown>;
  createSignedUrl: (path: string) => Promise<string>;
};

// 품질 리뷰는 시도 폴더와 같은 깊이에 저장되므로 시도 목록에서 이 이름은 제외한다
export const qualityReviewsDirectoryName = "quality-reviews";

export type ArchiveKey = {
  environment: string;
  subjectHash: string;
  generationId: string;
  attemptId: string;
};

export type ArchiveFile = { name: string; stage: string; createdAt?: string };

export type ArchiveDetail = {
  summary: ArchiveSummary;
  files: ArchiveFile[];
  latest: unknown;
};

export type ArchiveSummary = {
  subjectHash: string;
  generationId: string;
  attemptId: string;
  startedAt?: string;
  stages: string[];
  status: "completed" | "failed" | "incomplete";
  failedAfter?: string;
};

export class ArchiveQueryError extends Error {
  constructor() {
    super("INVALID_ARCHIVE_QUERY");
    this.name = "ArchiveQueryError";
  }
}

export class ArchiveNotFoundError extends Error {
  constructor() {
    super("ARCHIVE_NOT_FOUND");
    this.name = "ArchiveNotFoundError";
  }
}

const environments = ["development", "production"];
// 완료·실패 자체는 "무엇 직후에 실패했는지"가 될 수 없다
const failedStages: readonly string[] = resumeDebugStages.filter(
  (stage) => stage !== "completed" && stage !== "failed",
);
const idPattern = /^[A-Za-z0-9_-]{1,128}$/;
const maxPageSize = 100;

const validateQuery = (query: {
  environment: string;
  generationId?: string;
  attemptId?: string;
  failedStage?: string;
  page?: number;
  pageSize?: number;
}): void => {
  const valid =
    environments.includes(query.environment) &&
    (query.generationId === undefined || idPattern.test(query.generationId)) &&
    (query.attemptId === undefined || idPattern.test(query.attemptId)) &&
    (query.failedStage === undefined ||
      failedStages.includes(query.failedStage)) &&
    (query.page === undefined ||
      (Number.isInteger(query.page) && query.page >= 1)) &&
    (query.pageSize === undefined ||
      (Number.isInteger(query.pageSize) &&
        query.pageSize >= 1 &&
        query.pageSize <= maxPageSize));
  if (!valid) throw new ArchiveQueryError();
};

export const archiveDirectory = (key: ArchiveKey): string => {
  if (
    !environments.includes(key.environment) ||
    ![key.subjectHash, key.generationId, key.attemptId].every((id) =>
      idPattern.test(id),
    )
  )
    throw new ArchiveQueryError();
  return `debug/resume/${key.environment}/${key.subjectHash}/${key.generationId}/${key.attemptId}`;
};

// 폴더를 동시에 조회하는 최대 수. Storage 호출 제한을 넘지 않으면서 순차 조회의 지연을 줄인다
export const archiveListConcurrency = 8;

// 입력 순서를 유지하며 동시에 limit개까지만 실행한다. 하나가 실패하면 새 작업을 시작하지 않고 그 오류를 던진다
const mapLimit = async <T, R>(
  items: readonly T[],
  limit: number,
  run: (item: T) => Promise<R>,
): Promise<R[]> => {
  const results = new Array<R>(items.length);
  let next = 0;
  let failed = false;
  const worker = async (): Promise<void> => {
    while (!failed && next < items.length) {
      const index = next++;
      try {
        results[index] = await run(items[index]);
      } catch (error) {
        failed = true;
        throw error;
      }
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker),
  );
  return results;
};

const listPageSize = 100;
const defaultPageSize = 20;

// Storage 목록은 한 번에 일부만 주므로 같은 prefix의 나머지를 이어서 읽는다
export const listAllObjects = async (
  storage: ArchiveListStorage,
  prefix: string,
): Promise<StorageEntry[]> => {
  const entries: StorageEntry[] = [];
  for (let offset = 0; ; offset += listPageSize) {
    const page = await storage.listObjects(prefix, {
      limit: listPageSize,
      offset,
    });
    entries.push(...page);
    if (page.length < listPageSize) return entries;
  }
};

// 기록 파일명은 `NNN-{stage}.json`이고 순번이 곧 기록 순서다
const stageOf = (fileName: string): string | null =>
  fileName.match(/^\d{3}-([a-z_]+)\.json$/)?.[1] ?? null;

const summarize = (
  subjectHash: string,
  generationId: string,
  attemptId: string,
  files: StorageEntry[],
): ArchiveSummary => {
  const stages = files
    .filter((entry) => entry.kind === "file")
    .map((entry) => stageOf(entry.name))
    .filter((stage): stage is string => stage !== null);
  const failedIndex = stages.indexOf("failed");
  const status =
    failedIndex >= 0
      ? "failed"
      : stages.includes("completed")
        ? "completed"
        : "incomplete";
  const startedAt = files
    .map((entry) => entry.createdAt)
    .filter((value): value is string => value !== undefined)
    .sort()[0];
  return {
    subjectHash,
    generationId,
    attemptId,
    ...(startedAt ? { startedAt } : {}),
    stages,
    status,
    ...(failedIndex > 0 ? { failedAfter: stages[failedIndex - 1] } : {}),
  };
};

export const createResumeDebugArchiveReader = (
  storage: ArchiveReadStorage,
) => ({
  signedUrl: async (key: ArchiveKey, fileName: string): Promise<string> => {
    const path = archiveDirectory(key);
    // 목록에 있는 단계 파일만 서명해 다른 실행이나 임의 객체로 넘어가지 못하게 한다
    const entries = await listAllObjects(storage, path);
    const listed = entries.some(
      (entry) =>
        entry.kind === "file" &&
        entry.name === fileName &&
        stageOf(entry.name) !== null,
    );
    if (!listed) throw new ArchiveNotFoundError();
    return storage.createSignedUrl(`${path}/${fileName}`);
  },
  get: async (key: ArchiveKey): Promise<ArchiveDetail> => {
    const path = archiveDirectory(key);
    const entries = await listAllObjects(storage, path);
    const files = entries.flatMap((entry): ArchiveFile[] => {
      const stage = entry.kind === "file" ? stageOf(entry.name) : null;
      return stage
        ? [
            {
              name: entry.name,
              stage,
              ...(entry.createdAt ? { createdAt: entry.createdAt } : {}),
            },
          ]
        : [];
    });
    const last = files[files.length - 1];
    if (!last) throw new ArchiveNotFoundError();
    return {
      summary: summarize(
        key.subjectHash,
        key.generationId,
        key.attemptId,
        entries,
      ),
      files,
      // 마지막 기록은 앞 단계의 요청·응답·검증을 누적해 담고 있다
      latest: await storage.getJson(`${path}/${last.name}`),
    };
  },
  list: async (query: {
    environment: string;
    generationId?: string;
    attemptId?: string;
    failedStage?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ items: ArchiveSummary[]; hasMore: boolean }> => {
    validateQuery(query);
    const root = `debug/resume/${query.environment}`;
    const folders = (entries: StorageEntry[]) =>
      entries.filter((entry) => entry.kind === "folder");
    // 단계마다 폴더를 병렬로 조회한다. 일치하지 않는 폴더는 열지 않아 필터가 Storage 호출 수를 줄인다
    const subjects = folders(await listAllObjects(storage, root));
    const generations = (
      await mapLimit(subjects, archiveListConcurrency, async (subject) =>
        folders(await listAllObjects(storage, `${root}/${subject.name}`))
          .filter(
            (generation) =>
              !query.generationId || generation.name === query.generationId,
          )
          .map((generation) => ({
            subject: subject.name,
            generation: generation.name,
          })),
      )
    ).flat();
    const attempts = (
      await mapLimit(generations, archiveListConcurrency, async (entry) =>
        folders(
          await listAllObjects(
            storage,
            `${root}/${entry.subject}/${entry.generation}`,
          ),
        )
          .filter((attempt) => attempt.name !== qualityReviewsDirectoryName)
          .filter(
            (attempt) => !query.attemptId || attempt.name === query.attemptId,
          )
          .map((attempt) => ({ ...entry, attempt: attempt.name })),
      )
    ).flat();
    const summaries = await mapLimit(
      attempts,
      archiveListConcurrency,
      async (entry) =>
        summarize(
          entry.subject,
          entry.generation,
          entry.attempt,
          await listAllObjects(
            storage,
            `${root}/${entry.subject}/${entry.generation}/${entry.attempt}`,
          ),
        ),
    );
    const items = summaries.filter(
      (summary) =>
        !query.failedStage || summary.failedAfter === query.failedStage,
    );
    // 폴더 이름에는 시각이 없어 전체를 모은 뒤 첫 기록의 생성 시각으로 최신순을 만든다
    items.sort(
      (a, b) =>
        (b.startedAt ?? "").localeCompare(a.startedAt ?? "") ||
        a.attemptId.localeCompare(b.attemptId),
    );
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? defaultPageSize;
    const start = (page - 1) * pageSize;
    return {
      items: items.slice(start, start + pageSize),
      hasMore: items.length > start + pageSize,
    };
  },
});

export type ResumeDebugArchiveReader = ReturnType<
  typeof createResumeDebugArchiveReader
>;
