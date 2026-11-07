import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { inkColors, magnitudeColor } from "./chart-colors";
import { metricLabel } from "./quality-glossary";
import { formatRate, type MetricBreakdown } from "./quality-stats";

const rowHeight = 44;

export const MetricRateChart = ({
  rows,
}: {
  rows: readonly MetricBreakdown[];
}) => {
  const measured = rows
    .filter((row) => row.rate !== null)
    .map((row) => ({ ...row, name: metricLabel(row.metricId) }));
  const waiting = rows.filter((row) => row.rate === null);
  const height = Math.max(measured.length, 1) * rowHeight + 40;
  return (
    <div>
      <div
        role="img"
        aria-label={`지표별 통과율: ${rows.map((row) => `${metricLabel(row.metricId)} ${formatRate(row.rate)}`).join(", ")}`}
      >
        <ResponsiveContainer
          width="100%"
          height={height}
          initialDimension={{ width: 640, height }}
        >
          <BarChart
            layout="vertical"
            data={measured}
            margin={{ top: 4, right: 48, bottom: 4, left: 0 }}
          >
            <CartesianGrid horizontal={false} stroke={inkColors.grid} />
            <XAxis
              type="number"
              domain={[0, 1]}
              tickFormatter={(value: number) => formatRate(value)}
              stroke={inkColors.axis}
              tick={{ fill: inkColors.muted, fontSize: 12 }}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={132}
              stroke={inkColors.axis}
              tick={{ fill: inkColors.secondary, fontSize: 12 }}
            />
            <Tooltip
              cursor={{ fill: inkColors.grid, opacity: 0.4 }}
              formatter={(value) => [formatRate(Number(value)), "통과율"]}
            />
            <Bar
              dataKey="rate"
              fill={magnitudeColor}
              barSize={14}
              radius={[0, 4, 4, 0]}
              isAnimationActive={false}
            >
              <LabelList
                dataKey="rate"
                position="right"
                formatter={(value) => formatRate(Number(value))}
                fill={inkColors.secondary}
                fontSize={12}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      {waiting.length > 0 && (
        <p className="mt-2 text-xs text-slate-500">
          측정 대기:{" "}
          {waiting.map((row) => metricLabel(row.metricId)).join(", ")}
        </p>
      )}
    </div>
  );
};
