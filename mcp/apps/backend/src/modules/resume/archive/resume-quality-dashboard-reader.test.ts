import {
  createFakeArchiveStorage,
  failedAttemptObjects,
  validResponse,
} from "@mcp/modules/resume/testing/fake-archive-storage";
import { createResumeQualityDashboardReader } from "@mcp/modules/resume/archive/resume-quality-dashboard-reader";

const evaluation = {
  run: {
    evaluationId: "gen-1-pdf-quality",
    evaluatedAt: "2026-11-06T00:00:00.000Z",
    cases: [{ caseId: "private-case-id" }],
  },
  aggregates: [
    {
      metricId: "pdf-layout",
      confirmedRate: null,
      lowerBound: 0.875,
      upperBound: 1,
      denominator: 8,
      blockingCases: 1,
      needsReviewCases: 1,
      failedCases: 0,
      passedCases: 7,
    },
  ],
};

describe("createResumeQualityDashboardReader", () => {
  it("평가가 있는 아카이브만 요약하고 비공개 케이스 내용을 응답하지 않는다", async () => {
    const storage = createFakeArchiveStorage({
      ...failedAttemptObjects(validResponse),
      "debug/resume/development/subj-a/gen-1/att-1/005-quality_evaluation.json":
        {
          qualityEvaluation: evaluation,
        },
    });
    const dashboard = createResumeQualityDashboardReader(storage);

    const result = await dashboard.list({ environment: "development" });

    expect(result).toMatchObject({
      hasMore: false,
      items: [
        {
          archive: {
            environment: "development",
            subjectHash: "subj-a",
            generationId: "gen-1",
            attemptId: "att-1",
          },
          evaluationId: "gen-1-pdf-quality",
          evaluatedAt: "2026-11-06T00:00:00.000Z",
          metrics: [
            {
              metricId: "pdf-layout",
              confirmedRate: null,
              lowerBound: 0.875,
              upperBound: 1,
              denominator: 8,
              blockingCases: 1,
              needsReviewCases: 1,
              failedCases: 0,
              passedCases: 7,
            },
          ],
        },
      ],
    });
    expect(JSON.stringify(result)).not.toContain("private-case-id");
  });

  it("같은 생성 아래 저장된 품질 리뷰 폴더가 있어도 평가 기록을 조회한다", async () => {
    const storage = createFakeArchiveStorage({
      ...failedAttemptObjects(validResponse),
      "debug/resume/development/subj-a/gen-1/att-1/005-quality_evaluation.json":
        {
          qualityEvaluation: evaluation,
        },
      "debug/resume/development/subj-a/gen-1/quality-reviews/gen-1-pdf-quality/review-1.json":
        { reviewId: "review-1" },
    });
    const dashboard = createResumeQualityDashboardReader(storage);

    const result = await dashboard.list({ environment: "development" });

    expect(result.items.map((item) => item.archive.attemptId)).toEqual([
      "att-1",
    ]);
  });

  it("오래된 아카이브 페이지를 건너뛰고 평가 기록만 페이지로 나눈다", async () => {
    const storage = createFakeArchiveStorage({
      ...failedAttemptObjects(validResponse),
      "debug/resume/development/subj-a/gen-1/att-1/005-quality_evaluation.json":
        {
          qualityEvaluation: evaluation,
        },
      "debug/resume/development/subj-b/gen-2/att-2/001-started.json": {
        stage: "started",
      },
      "debug/resume/development/subj-b/gen-2/att-2/002-quality_evaluation.json":
        {
          qualityEvaluation: {
            ...evaluation,
            run: { ...evaluation.run, evaluationId: "gen-2-pdf-quality" },
          },
        },
    });
    const dashboard = createResumeQualityDashboardReader(storage);

    const result = await dashboard.list({
      environment: "development",
      page: 1,
      pageSize: 1,
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0].evaluationId).toBe("gen-2-pdf-quality");
    expect(result.hasMore).toBe(true);
  });

  it("실행이 100개를 넘어도 환경 폴더를 한 번만 훑는다", async () => {
    const initial: Record<string, unknown> = {};
    for (let index = 0; index < 101; index += 1)
      initial[
        `debug/resume/development/subj-a/gen-${String(index).padStart(3, "0")}/att-1/001-started.json`
      ] = { stage: "started" };
    const storage = createFakeArchiveStorage(initial);
    const listObjects = jest.spyOn(storage, "listObjects");
    const dashboard = createResumeQualityDashboardReader(storage);

    await dashboard.list({ environment: "development" });

    const rootListings = listObjects.mock.calls.filter(
      ([prefix]) => prefix === "debug/resume/development",
    );
    expect(rootListings).toHaveLength(1);
  });

  it("summarize는 페이지 수와 상관없이 평가가 있는 모든 기록을 한 번에 돌려준다", async () => {
    const initial: Record<string, unknown> = {};
    for (let index = 0; index < 25; index += 1) {
      const generation = `gen-${String(index).padStart(2, "0")}`;
      initial[
        `debug/resume/development/subj-a/${generation}/att-1/001-quality_evaluation.json`
      ] = {
        qualityEvaluation: {
          ...evaluation,
          run: { ...evaluation.run, evaluationId: `${generation}-pdf-quality` },
        },
      };
    }
    const storage = createFakeArchiveStorage(initial);
    const dashboard = createResumeQualityDashboardReader(storage);

    const result = await dashboard.summarize({
      environment: "development",
      maxArchives: 300,
    });

    expect(result.items).toHaveLength(25);
    expect(result.truncated).toBe(false);
    expect(result.archivesScanned).toBe(25);
  });

  it("summarize는 최근 실행부터 상한까지만 읽고 잘렸음을 알린다", async () => {
    const initial: Record<string, unknown> = {};
    for (const generation of ["gen-1", "gen-2", "gen-3"])
      initial[
        `debug/resume/development/subj-a/${generation}/att-1/001-quality_evaluation.json`
      ] = {
        qualityEvaluation: {
          ...evaluation,
          run: { ...evaluation.run, evaluationId: `${generation}-pdf-quality` },
        },
      };
    const storage = createFakeArchiveStorage(initial);
    const dashboard = createResumeQualityDashboardReader(storage);

    const result = await dashboard.summarize({
      environment: "development",
      maxArchives: 2,
    });

    expect(result.truncated).toBe(true);
    expect(result.archivesScanned).toBe(2);
    expect(result.items).toHaveLength(2);
    expect(result.items.map((item) => item.archive.generationId)).toEqual([
      "gen-3",
      "gen-2",
    ]);
  });

  it("summarize도 잘못된 환경 이름은 저장소를 읽기 전에 거부한다", async () => {
    const storage = createFakeArchiveStorage({});
    const dashboard = createResumeQualityDashboardReader(storage);

    await expect(
      dashboard.summarize({ environment: "../x", maxArchives: 10 }),
    ).rejects.toThrow();
    expect(storage.calls.listObjects).toBe(0);
  });
});
