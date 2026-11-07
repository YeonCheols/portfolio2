import type { MetricBreakdown, TrendPoint } from "./quality-stats";

// 차트 테스트가 공유하는 집계 결과 예시다
export const rows: MetricBreakdown[] = [
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
    metricId: "text-proofreading",
    passed: 2,
    failed: 0,
    needsReview: 0,
    blocking: 0,
    undecided: 0,
    denominator: 2,
    rate: 1,
  },
  {
    metricId: "numeric-integrity",
    passed: 0,
    failed: 0,
    needsReview: 0,
    blocking: 0,
    undecided: 0,
    denominator: 0,
    rate: null,
  },
];

export const points: TrendPoint[] = [
  {
    evaluatedAt: "2026-11-05T01:00:00.000Z",
    label: "11-05 01:00",
    rates: { "pdf-layout": 0.625 },
  },
  {
    evaluatedAt: "2026-11-06T09:30:00.000Z",
    label: "11-06 09:30",
    rates: { "pdf-layout": 0.75, "text-proofreading": 1 },
  },
];
