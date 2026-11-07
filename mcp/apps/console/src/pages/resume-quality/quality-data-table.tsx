import { metricLabel } from "./quality-glossary";
import {
  formatRate,
  type MetricBreakdown,
  type TrendPoint,
} from "./quality-stats";

const cell = "px-3 py-2 text-right tabular-nums";
const head = "px-3 py-2 text-right text-xs font-semibold text-slate-500";

// 차트의 모든 수치를 같은 값으로 읽을 수 있게 하는 표 보기다. 색이나 차트를 못 보는 경우의 대체 경로다
export const QualityDataTable = ({
  rows,
  metricIds,
  points,
}: {
  rows: readonly MetricBreakdown[];
  metricIds: readonly string[];
  points: readonly TrendPoint[];
}) => (
  <details className="rounded-2xl border border-slate-200 bg-white p-4">
    <summary className="cursor-pointer text-sm font-bold text-slate-700">
      수치를 표로 보기
    </summary>
    <div className="mt-4 grid gap-6 overflow-x-auto">
      <table aria-label="지표별 수치" className="w-full text-sm">
        <thead>
          <tr>
            <th
              scope="col"
              className="px-3 py-2 text-left text-xs font-semibold text-slate-500"
            >
              지표
            </th>
            {[
              "통과율",
              "통과",
              "검토 대기",
              "실패",
              "측정 실패",
              "차단",
              "전체 검사 수",
            ].map((title) => (
              <th key={title} scope="col" className={head}>
                {title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.metricId} className="border-t border-slate-100">
              <th scope="row" className="px-3 py-2 text-left font-semibold">
                {metricLabel(row.metricId)}
              </th>
              <td className={cell}>{formatRate(row.rate)}</td>
              <td className={cell}>{row.passed}</td>
              <td className={cell}>{row.needsReview}</td>
              <td className={cell}>{row.failed}</td>
              <td className={cell}>{row.undecided}</td>
              <td className={cell}>{row.blocking}</td>
              <td className={cell}>{row.denominator}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <table aria-label="통과율 추이 수치" className="w-full text-sm">
        <thead>
          <tr>
            <th
              scope="col"
              className="px-3 py-2 text-left text-xs font-semibold text-slate-500"
            >
              평가 시각
            </th>
            {metricIds.map((metricId) => (
              <th key={metricId} scope="col" className={head}>
                {metricLabel(metricId)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {points.map((point) => (
            <tr key={point.evaluatedAt} className="border-t border-slate-100">
              <th scope="row" className="px-3 py-2 text-left font-semibold">
                {point.label}
              </th>
              {metricIds.map((metricId) => {
                const rate = point.rates[metricId];
                return (
                  <td key={metricId} className={cell}>
                    {rate === null || rate === undefined
                      ? "–"
                      : formatRate(rate)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </details>
);
