import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { inkColors, seriesColors } from "./chart-colors";
import { metricLabel } from "./quality-glossary";
import { formatRate, type TrendPoint } from "./quality-stats";

const height = 280;

export const TrendChart = ({
  metricIds,
  points,
}: {
  metricIds: readonly string[];
  points: readonly TrendPoint[];
}) => {
  if (points.length < 2)
    return (
      <p className="text-sm text-slate-600">
        추이를 그리려면 평가 기록이 2건 이상 필요합니다.
      </p>
    );
  const data = points.map((point) => ({ label: point.label, ...point.rates }));
  return (
    <div>
      {metricIds.length > 1 && (
        <ul
          aria-label="지표 범례"
          className="mb-3 flex flex-wrap gap-x-4 gap-y-1"
        >
          {metricIds.map((metricId, index) => (
            <li
              key={metricId}
              className="flex items-center gap-1.5 text-xs text-slate-600"
            >
              <span
                aria-hidden="true"
                className="inline-block h-0.5 w-4 rounded-full"
                style={{
                  backgroundColor: seriesColors[index % seriesColors.length],
                }}
              />
              {metricLabel(metricId)}
            </li>
          ))}
        </ul>
      )}
      <div
        role="img"
        aria-label={`통과율 추이: 평가 기록 ${points.length}건, 지표 ${metricIds.length}개`}
      >
        <ResponsiveContainer
          width="100%"
          height={height}
          initialDimension={{ width: 640, height }}
        >
          <LineChart
            data={data}
            margin={{ top: 8, right: 16, bottom: 4, left: 0 }}
          >
            <CartesianGrid vertical={false} stroke={inkColors.grid} />
            <XAxis
              dataKey="label"
              stroke={inkColors.axis}
              tick={{ fill: inkColors.muted, fontSize: 12 }}
            />
            <YAxis
              domain={[0, 1]}
              tickFormatter={(value: number) => formatRate(value)}
              stroke={inkColors.axis}
              tick={{ fill: inkColors.muted, fontSize: 12 }}
              width={48}
            />
            <Tooltip
              formatter={(value, name) => [formatRate(Number(value)), name]}
            />
            {metricIds.map((metricId, index) => {
              const color = seriesColors[index % seriesColors.length];
              return (
                <Line
                  key={metricId}
                  type="monotone"
                  dataKey={metricId}
                  name={metricLabel(metricId)}
                  stroke={color}
                  strokeWidth={2}
                  dot={{ r: 4, fill: color, stroke: "#fcfcfb", strokeWidth: 2 }}
                  activeDot={{ r: 5 }}
                  isAnimationActive={false}
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
