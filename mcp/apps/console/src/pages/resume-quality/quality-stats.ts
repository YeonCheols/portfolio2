import type { ResumeQualityDashboardItem } from "../../types";

export type QualityTotals = {
  records: number;
  passed: number;
  failed: number;
  needsReview: number;
  blocking: number;
  denominator: number;
};

export type MetricBreakdown = {
  metricId: string;
  passed: number;
  failed: number;
  needsReview: number;
  blocking: number;
  undecided: number;
  denominator: number;
  rate: number | null;
};

export type TrendPoint = {
  evaluatedAt: string;
  label: string;
  rates: Record<string, number | null>;
};

export const summarizeQuality = (
  items: readonly ResumeQualityDashboardItem[],
): QualityTotals => {
  const totals: QualityTotals = {
    records: items.length,
    passed: 0,
    failed: 0,
    needsReview: 0,
    blocking: 0,
    denominator: 0,
  };
  for (const item of items)
    for (const metric of item.metrics) {
      totals.passed += metric.passedCases;
      totals.failed += metric.failedCases;
      totals.needsReview += metric.needsReviewCases;
      totals.blocking += metric.blockingCases;
      totals.denominator += metric.denominator;
    }
  return totals;
};

const rateOf = (passed: number, denominator: number): number | null =>
  denominator > 0 ? passed / denominator : null;

// 지표는 처음 나온 순서를 유지한다. 색은 지표 이름에 묶이므로 필터로 순서가 바뀌지 않게 한다
export const metricBreakdown = (
  items: readonly ResumeQualityDashboardItem[],
): MetricBreakdown[] => {
  const rows = new Map<string, MetricBreakdown>();
  for (const item of items)
    for (const metric of item.metrics) {
      const row = rows.get(metric.metricId) ?? {
        metricId: metric.metricId,
        passed: 0,
        failed: 0,
        needsReview: 0,
        blocking: 0,
        undecided: 0,
        denominator: 0,
        rate: null,
      };
      row.passed += metric.passedCases;
      row.failed += metric.failedCases;
      row.needsReview += metric.needsReviewCases;
      row.blocking += metric.blockingCases;
      row.denominator += metric.denominator;
      rows.set(metric.metricId, row);
    }
  return [...rows.values()].map((row) => ({
    ...row,
    undecided: Math.max(
      0,
      row.denominator - row.passed - row.failed - row.needsReview,
    ),
    rate: rateOf(row.passed, row.denominator),
  }));
};

const labelOf = (evaluatedAt: string): string =>
  evaluatedAt.slice(5, 16).replace("T", " ");

export const trendSeries = (
  items: readonly ResumeQualityDashboardItem[],
): { metricIds: string[]; points: TrendPoint[] } => {
  const metricIds = metricBreakdown(items).map((row) => row.metricId);
  const points = [...items]
    .sort((a, b) => a.evaluatedAt.localeCompare(b.evaluatedAt))
    .map((item) => ({
      evaluatedAt: item.evaluatedAt,
      label: labelOf(item.evaluatedAt),
      rates: Object.fromEntries(
        item.metrics.map((metric) => [
          metric.metricId,
          rateOf(metric.passedCases, metric.denominator),
        ]),
      ),
    }));
  return { metricIds, points };
};

export const formatRate = (rate: number | null): string =>
  rate === null ? "측정 대기" : `${Math.round(rate * 100)}%`;

// 화면의 모든 지표 목록은 같은 순서(통과율 높은 순)로 보여 준다. 측정 대기는 맨 뒤에 둔다.
// 추이 차트의 색은 지표 이름에 묶여 있어 metricBreakdown의 처음 나온 순서를 따로 유지한다
export const sortByRateDesc = (
  rows: readonly MetricBreakdown[],
): MetricBreakdown[] =>
  [...rows].sort((a, b) => {
    if (a.rate === null && b.rate !== null) return 1;
    if (a.rate !== null && b.rate === null) return -1;
    return (
      (b.rate ?? 0) - (a.rate ?? 0) ||
      b.denominator - a.denominator ||
      a.metricId.localeCompare(b.metricId)
    );
  });
