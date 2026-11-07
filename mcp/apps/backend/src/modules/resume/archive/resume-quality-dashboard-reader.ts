import type {
  ArchiveReadStorage,
  ArchiveSummary,
} from "@mcp/modules/resume/archive/resume-debug-archive-reader";
import { createResumeDebugArchiveReader } from "@mcp/modules/resume/archive/resume-debug-archive-reader";

export type ResumeQualityDashboardMetric = {
  metricId: string;
  confirmedRate: number | null;
  lowerBound: number | null;
  upperBound: number | null;
  denominator: number;
  blockingCases: number;
  needsReviewCases: number;
  failedCases: number;
  passedCases: number;
};

export type ResumeQualityDashboardItem = {
  archive: {
    environment: string;
    subjectHash: string;
    generationId: string;
    attemptId: string;
    startedAt?: string;
    status: ArchiveSummary["status"];
  };
  evaluationId: string;
  evaluatedAt: string;
  metrics: ResumeQualityDashboardMetric[];
};

// 목록 전체를 합산할 때 읽는 최근 실행의 상한이다. 실행 하나마다 저장소를 읽으므로 비용을 제한한다
export const maxQualityDashboardArchives = 300;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const asMetric = (value: unknown): ResumeQualityDashboardMetric | null => {
  if (!isRecord(value)) return null;
  const countFields = [
    "denominator",
    "blockingCases",
    "needsReviewCases",
    "failedCases",
    "passedCases",
  ] as const;
  if (
    typeof value.metricId !== "string" ||
    ["confirmedRate", "lowerBound", "upperBound"].some(
      (field) =>
        value[field] !== null &&
        (typeof value[field] !== "number" || !Number.isFinite(value[field])),
    ) ||
    countFields.some((field) => {
      const count = value[field];
      return typeof count !== "number" || !Number.isFinite(count) || count < 0;
    })
  )
    return null;
  return {
    metricId: value.metricId,
    confirmedRate: value.confirmedRate as number | null,
    lowerBound: value.lowerBound as number | null,
    upperBound: value.upperBound as number | null,
    denominator: value.denominator as number,
    blockingCases: value.blockingCases as number,
    needsReviewCases: value.needsReviewCases as number,
    failedCases: value.failedCases as number,
    passedCases: value.passedCases as number,
  };
};

const mapLimit = async <T, R>(
  items: readonly T[],
  limit: number,
  run: (item: T) => Promise<R>,
): Promise<R[]> => {
  const results = new Array<R>(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await run(items[index]);
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker),
  );
  return results;
};

export const createResumeQualityDashboardReader = (
  storage: ArchiveReadStorage,
) => {
  const archiveReader = createResumeDebugArchiveReader(storage);

  // 실행 하나의 마지막 기록에서 평가 요약을 읽는다. 평가가 없거나 형식이 맞지 않으면 건너뛴다
  const toItem = async (
    environment: string,
    summary: ArchiveSummary,
  ): Promise<ResumeQualityDashboardItem | null> => {
    const detail = await archiveReader.get({
      environment,
      subjectHash: summary.subjectHash,
      generationId: summary.generationId,
      attemptId: summary.attemptId,
    });
    const latest = isRecord(detail.latest) ? detail.latest : null;
    const evaluation = latest?.qualityEvaluation;
    if (!isRecord(evaluation) || !isRecord(evaluation.run)) return null;
    const run = evaluation.run;
    if (
      typeof run.evaluationId !== "string" ||
      typeof run.evaluatedAt !== "string" ||
      !Array.isArray(evaluation.aggregates)
    )
      return null;
    const metrics = evaluation.aggregates.map(asMetric);
    if (metrics.length === 0 || metrics.some((metric) => metric === null))
      return null;
    return {
      archive: {
        environment,
        subjectHash: summary.subjectHash,
        generationId: summary.generationId,
        attemptId: summary.attemptId,
        ...(summary.startedAt ? { startedAt: summary.startedAt } : {}),
        status: summary.status,
      },
      evaluationId: run.evaluationId,
      evaluatedAt: run.evaluatedAt,
      metrics: metrics as ResumeQualityDashboardMetric[],
    };
  };

  const readItems = async (
    environment: string,
    summaries: readonly ArchiveSummary[],
  ): Promise<ResumeQualityDashboardItem[]> =>
    (
      await mapLimit(summaries, 8, (summary) => toItem(environment, summary))
    ).filter((item): item is ResumeQualityDashboardItem => item !== null);

  return {
    list: async (query: {
      environment: string;
      page?: number;
      pageSize?: number;
    }): Promise<{ items: ResumeQualityDashboardItem[]; hasMore: boolean }> => {
      const page = query.page ?? 1;
      const pageSize = query.pageSize ?? 20;
      if (
        !Number.isInteger(page) ||
        page < 1 ||
        !Number.isInteger(pageSize) ||
        pageSize < 1 ||
        pageSize > 100
      )
        await archiveReader.list({ ...query, page, pageSize });

      const start = (page - 1) * pageSize;
      const needed = start + pageSize + 1;
      // 환경 폴더는 한 번만 훑고, 평가를 읽는 실행만 필요한 만큼 이어서 읽는다
      const summaries = await archiveReader.listAll({
        environment: query.environment,
      });
      const matches: ResumeQualityDashboardItem[] = [];
      for (
        let offset = 0;
        offset < summaries.length && matches.length < needed;
        offset += 100
      )
        matches.push(
          ...(await readItems(
            query.environment,
            summaries.slice(offset, offset + 100),
          )),
        );

      return {
        items: matches.slice(start, start + pageSize),
        hasMore: matches.length > start + pageSize,
      };
    },

    // 목록 전체를 합산하려는 화면용이다. 최근 실행부터 maxArchives개까지만 읽어 읽기 비용을 제한한다
    summarize: async (query: {
      environment: string;
      maxArchives: number;
    }): Promise<{
      items: ResumeQualityDashboardItem[];
      truncated: boolean;
      archivesScanned: number;
    }> => {
      const summaries = await archiveReader.listAll({
        environment: query.environment,
      });
      const scanned = summaries.slice(0, query.maxArchives);
      return {
        items: await readItems(query.environment, scanned),
        truncated: summaries.length > query.maxArchives,
        archivesScanned: scanned.length,
      };
    },
  };
};
