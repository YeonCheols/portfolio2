import { useState } from "react";

import { statusColors } from "./chart-colors";
import { metricLabel } from "./quality-glossary";
import type { MetricBreakdown } from "./quality-stats";

const outcomes = [
  { key: "passed", label: "통과", glyph: "✓", color: statusColors.good },
  {
    key: "needsReview",
    label: "검토 대기",
    glyph: "!",
    color: statusColors.warning,
  },
  { key: "failed", label: "실패", glyph: "✕", color: statusColors.critical },
  {
    key: "undecided",
    label: "측정 실패",
    glyph: "–",
    color: statusColors.neutral,
  },
] as const;

const percentLabel = (count: number, total: number): string => {
  const percent = (count / total) * 100;
  return percent < 1 ? "1% 미만" : `${Math.round(percent)}%`;
};

// 판정 구성은 비율을 한눈에 보는 용도라 가로 누적 막대 하나로 그리고, 수치는 읽기용 요약과 표에 둔다
export const OutcomeBars = ({ rows }: { rows: readonly MetricBreakdown[] }) => {
  const [hovered, setHovered] = useState<string | null>(null);
  return (
    <div>
      <ul aria-label="판정 범례" className="flex flex-wrap gap-x-4 gap-y-1">
        {outcomes.map((outcome) => (
          <li
            key={outcome.key}
            className="flex items-center gap-1.5 text-xs text-slate-600"
          >
            <span
              aria-hidden="true"
              className="inline-block size-2.5 rounded-sm"
              style={{ backgroundColor: outcome.color }}
            />
            {outcome.glyph} {outcome.label}
          </li>
        ))}
      </ul>
      <ul aria-label="지표별 판정 구성" className="mt-4 grid gap-4">
        {rows.map((row) => {
          const total =
            row.passed + row.needsReview + row.failed + row.undecided;
          const parts = outcomes
            .map((outcome) => ({ ...outcome, count: row[outcome.key] }))
            .filter((part) => part.count > 0);
          return (
            <li key={row.metricId}>
              <p className="text-sm font-semibold text-slate-700">
                {metricLabel(row.metricId)}
              </p>
              {total === 0 ? (
                <p className="mt-1 text-xs text-slate-500">측정 대기</p>
              ) : (
                <div
                  role="img"
                  aria-label={`${metricLabel(row.metricId)} ${parts.map((part) => `${part.label} ${part.count}건`).join(", ")}`}
                  className="mt-1.5 flex h-4 gap-0.5"
                >
                  {parts.map((part) => {
                    const segmentKey = `${row.metricId}:${part.key}`;
                    return (
                      <div
                        key={part.key}
                        data-testid="outcome-segment"
                        onMouseEnter={() => setHovered(segmentKey)}
                        onMouseLeave={() => setHovered(null)}
                        className="relative h-full first:rounded-l-full last:rounded-r-full"
                        style={{
                          width: `${(part.count / total) * 100}%`,
                          backgroundColor: part.color,
                        }}
                      >
                        {hovered === segmentKey && (
                          <span
                            role="tooltip"
                            className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-xs font-semibold text-white"
                          >
                            {`${part.label} ${part.count}건 (${percentLabel(part.count, total)})`}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};
