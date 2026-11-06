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
});
