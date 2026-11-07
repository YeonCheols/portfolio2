import { useEffect, useState, type ReactNode } from "react";

import { AdminLayout } from "../../shared/ui/admin-layout";
import { LoadingSpinner } from "../../shared/ui/loading-spinner";
import { SelectField } from "../../shared/ui/select-field";
import type { ModelEnvironment } from "../../types";
import {
  listAllResumeQualityDashboard,
  type ResumeQualitySummary,
} from "./api/quality-api";
import { MetricRateChart } from "./metric-rate-chart";
import { OutcomeBars } from "./outcome-bars";
import { QualityDataTable } from "./quality-data-table";
import { MetricGuide, QualityGuide } from "./quality-guide";
import { QualityKpiRow } from "./quality-kpi-row";
import {
  metricBreakdown,
  sortByRateDesc,
  summarizeQuality,
  trendSeries,
} from "./quality-stats";
import { TrendChart } from "./trend-chart";

type PageState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | ({ status: "done" } & ResumeQualitySummary);

const environments = [
  { value: "development", label: "개발" },
  { value: "production", label: "운영" },
] as const;

const environmentOf = (search: string): ModelEnvironment =>
  new URLSearchParams(search).get("environment") === "production"
    ? "production"
    : "development";

export const ResumeQualityPage = ({ search }: { search: string }) => {
  const environment = environmentOf(search);
  const [selectedEnvironment, setSelectedEnvironment] =
    useState<ModelEnvironment>(environment);
  const [state, setState] = useState<PageState>({ status: "loading" });

  useEffect(() => {
    let active = true;
    setSelectedEnvironment(environment);
    setState({ status: "loading" });
    listAllResumeQualityDashboard({ environment })
      .then((result) => {
        if (active) setState({ status: "done", ...result });
      })
      .catch((error: unknown) => {
        if (!active) return;
        setState({
          status: "error",
          message:
            error instanceof Error && error.message
              ? error.message
              : "품질 평가를 불러오지 못했습니다.",
        });
      });
    return () => {
      active = false;
    };
    // 환경이 바뀔 때만 다시 조회하고 같은 환경의 재렌더링은 재호출하지 않는다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [environment]);

  const items = state.status === "done" ? state.items : [];
  const totals = summarizeQuality(items);
  const ranked = sortByRateDesc(metricBreakdown(items));
  const trend = trendSeries(items);

  return (
    <AdminLayout current="resume-quality">
      <p className="text-xs font-extrabold uppercase tracking-[.14em] text-blue-700">
        MCP 관리자
      </p>
      <h1 className="mb-3 mt-2 text-4xl font-bold tracking-tight">
        이력서 품질 대시보드
      </h1>
      <p className="leading-relaxed text-slate-600">
        AI가 만든 이력서 PDF의 품질 검사 결과를 한눈에 확인합니다.
      </p>

      <QualityGuide />

      <form
        action="/admin/resume-quality"
        method="get"
        aria-label="품질 평가 필터"
        className="mt-7 flex flex-wrap items-end gap-4 rounded-2xl border border-slate-200 bg-white p-5"
      >
        <SelectField<ModelEnvironment>
          id="quality-environment"
          label="환경"
          value={selectedEnvironment}
          options={environments}
          onChange={setSelectedEnvironment}
        />
        <input type="hidden" name="environment" value={selectedEnvironment} />
        <button
          type="submit"
          className="min-h-11 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white"
        >
          조회
        </button>
      </form>

      <section aria-label="조회 상태" className="mt-6">
        {state.status === "loading" && (
          <LoadingSpinner label="품질 평가를 불러오는 중입니다." />
        )}
        {state.status === "error" && (
          <p role="alert" className="text-sm text-red-700">
            {state.message}
          </p>
        )}
        {state.status === "done" && items.length === 0 && (
          <p className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
            선택한 환경에 저장된 품질 평가가 없습니다.
          </p>
        )}
      </section>

      {state.status === "done" && items.length > 0 && (
        <>
          <p className="text-sm text-slate-600">
            {`기록 ${items.length}건을 합산했습니다.`}
            {state.truncated &&
              ` 실행이 많아 최근 ${state.archivesScanned}개까지만 합산했습니다.`}
          </p>
          <QualityKpiRow totals={totals} />
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <ChartCard
              title="지표별 통과율"
              description="지표마다 검사 건 중 몇 %가 통과했는지 보여줍니다. 막대가 길수록 좋고, 높은 순서로 정렬했습니다."
            >
              <MetricRateChart rows={ranked} />
            </ChartCard>
            <ChartCard
              title="판정 구성"
              description="지표마다 검사 건이 어떤 판정으로 나뉘었는지 비율로 보여줍니다. 초록(통과)이 길수록 좋고, 통과율이 높은 순서로 정렬했습니다."
            >
              <OutcomeBars rows={ranked} />
            </ChartCard>
          </div>
          <div className="mt-4">
            <ChartCard
              title="통과율 추이"
              description="평가 시각 순으로 지표별 통과율이 오르는지 내리는지 봅니다. 평가 기록이 2건 이상 있어야 그려집니다."
            >
              <TrendChart metricIds={trend.metricIds} points={trend.points} />
            </ChartCard>
          </div>
          <div className="mt-4">
            <QualityDataTable
              rows={ranked}
              metricIds={trend.metricIds}
              points={trend.points}
            />
          </div>
        </>
      )}

      <MetricGuide />
    </AdminLayout>
  );
};

const ChartCard = ({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) => (
  <section className="rounded-2xl border border-slate-200 bg-white p-5">
    <h2 className="text-base font-bold text-slate-900">{title}</h2>
    <p className="mb-4 mt-1 text-xs leading-relaxed text-slate-500">
      {description}
    </p>
    {children}
  </section>
);
