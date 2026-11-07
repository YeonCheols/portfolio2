import { describe, expect, it } from "vitest";

import type { ResumeQualityDashboardItem } from "../../types";

import {
  metricBreakdown,
  sortByRateDesc,
  summarizeQuality,
  trendSeries,
} from "./quality-stats";

const metric = (
  metricId: string,
  counts: Partial<
    Record<
      | "denominator"
      | "passedCases"
      | "failedCases"
      | "needsReviewCases"
      | "blockingCases",
      number
    >
  >,
) => ({
  metricId,
  confirmedRate: null,
  lowerBound: null,
  upperBound: null,
  denominator: 0,
  passedCases: 0,
  failedCases: 0,
  needsReviewCases: 0,
  blockingCases: 0,
  ...counts,
});

const item = (
  generationId: string,
  evaluatedAt: string,
  metrics: ReturnType<typeof metric>[],
): ResumeQualityDashboardItem => ({
  archive: {
    environment: "development",
    subjectHash: "subj",
    generationId,
    attemptId: "att-1",
    status: "completed",
  },
  evaluationId: `${generationId}-pdf-quality`,
  evaluatedAt,
  metrics,
});

const items = [
  item("gen-2", "2026-11-06T09:30:00.000Z", [
    metric("pdf-layout", {
      denominator: 4,
      passedCases: 3,
      failedCases: 1,
    }),
    metric("pdf-text", { denominator: 2, passedCases: 2 }),
  ]),
  item("gen-1", "2026-11-05T01:00:00.000Z", [
    metric("pdf-layout", {
      denominator: 8,
      passedCases: 5,
      needsReviewCases: 2,
      blockingCases: 2,
    }),
  ]),
];

describe("summarizeQuality", () => {
  it("평가 기록 수와 모든 지표의 건수를 더한다", () => {
    expect(summarizeQuality(items)).toEqual({
      records: 2,
      passed: 10,
      failed: 1,
      needsReview: 2,
      blocking: 2,
      denominator: 14,
    });
  });

  it("기록이 없으면 모두 0이다", () => {
    expect(summarizeQuality([])).toEqual({
      records: 0,
      passed: 0,
      failed: 0,
      needsReview: 0,
      blocking: 0,
      denominator: 0,
    });
  });
});

describe("metricBreakdown", () => {
  it("지표별로 건수를 모으고 확인율은 확인 건수를 분모로 나눈다", () => {
    expect(metricBreakdown(items)).toEqual([
      {
        metricId: "pdf-layout",
        passed: 8,
        failed: 1,
        needsReview: 2,
        blocking: 2,
        undecided: 1,
        denominator: 12,
        rate: 8 / 12,
      },
      {
        metricId: "pdf-text",
        passed: 2,
        failed: 0,
        needsReview: 0,
        blocking: 0,
        undecided: 0,
        denominator: 2,
        rate: 1,
      },
    ]);
  });

  it("분모가 0이면 확인율을 계산하지 않고, 판정 합이 분모를 넘어도 미판정은 음수가 되지 않는다", () => {
    const rows = metricBreakdown([
      item("gen-3", "2026-11-06T00:00:00.000Z", [
        metric("empty", { denominator: 0 }),
        metric("over", { denominator: 1, passedCases: 1, failedCases: 1 }),
      ]),
    ]);

    expect(rows.find((row) => row.metricId === "empty")?.rate).toBeNull();
    expect(rows.find((row) => row.metricId === "over")?.undecided).toBe(0);
  });
});

describe("trendSeries", () => {
  it("평가 시각 오름차순으로 기록마다 지표별 확인율을 담는다", () => {
    const { metricIds, points } = trendSeries(items);

    expect(metricIds).toEqual(["pdf-layout", "pdf-text"]);
    expect(points.map((point) => point.evaluatedAt)).toEqual([
      "2026-11-05T01:00:00.000Z",
      "2026-11-06T09:30:00.000Z",
    ]);
    expect(points[0].label).toBe("11-05 01:00");
    expect(points[0].rates).toEqual({ "pdf-layout": 5 / 8 });
    expect(points[1].rates).toEqual({
      "pdf-layout": 3 / 4,
      "pdf-text": 1,
    });
  });

  it("입력 배열의 순서를 바꾸지 않는다", () => {
    const before = items.map((entry) => entry.evaluationId);

    trendSeries(items);

    expect(items.map((entry) => entry.evaluationId)).toEqual(before);
  });
});

describe("sortByRateDesc", () => {
  const row = (metricId: string, rate: number | null, denominator: number) => ({
    metricId,
    rate,
    denominator,
    passed: 0,
    failed: 0,
    needsReview: 0,
    blocking: 0,
    undecided: 0,
  });

  it("통과율이 높은 순서로 정렬하고 측정 대기는 맨 뒤에 둔다", () => {
    const sorted = sortByRateDesc([
      row("b", 0.5, 4),
      row("wait", null, 0),
      row("a", 1, 2),
      row("c", 0.75, 8),
    ]);

    expect(sorted.map((entry) => entry.metricId)).toEqual([
      "a",
      "c",
      "b",
      "wait",
    ]);
  });

  it("통과율이 같으면 검사 건수가 많은 순, 그다음 지표 ID 순으로 정한다", () => {
    const sorted = sortByRateDesc([
      row("z", 0.5, 2),
      row("y", 0.5, 8),
      row("x", 0.5, 8),
    ]);

    expect(sorted.map((entry) => entry.metricId)).toEqual(["x", "y", "z"]);
  });

  it("입력 배열을 바꾸지 않는다", () => {
    const input = [row("b", 0.5, 4), row("a", 1, 2)];

    sortByRateDesc(input);

    expect(input.map((entry) => entry.metricId)).toEqual(["b", "a"]);
  });
});
