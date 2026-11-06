import { useEffect, useState } from "react";

import { AdminLayout } from "../../shared/ui/admin-layout";
import { SelectField } from "../../shared/ui/select-field";
import type { ModelEnvironment, ResumeQualityDashboardItem } from "../../types";
import { listResumeQualityDashboard } from "./api/quality-api";

type PageState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "done"; items: ResumeQualityDashboardItem[]; hasMore: boolean };

const environments = [
  { value: "development", label: "개발" },
  { value: "production", label: "운영" },
] as const;

const environmentOf = (search: string): ModelEnvironment =>
  new URLSearchParams(search).get("environment") === "production"
    ? "production"
    : "development";

const pageOf = (search: string): number => {
  const value = Number(new URLSearchParams(search).get("page"));
  return Number.isInteger(value) && value > 0 ? value : 1;
};

const archiveHref = (item: ResumeQualityDashboardItem): string => {
  const params = new URLSearchParams({
    environment: item.archive.environment,
    subjectHash: item.archive.subjectHash,
    generationId: item.archive.generationId,
    attemptId: item.archive.attemptId,
  });
  return `/admin/debug/resume?${params}`;
};

const percentage = (metric: ResumeQualityDashboardItem["metrics"][number]) => {
  if (metric.confirmedRate !== null)
    return `${Math.round(metric.confirmedRate * 100)}%`;
  if (metric.lowerBound !== null && metric.upperBound !== null)
    return `${Math.round(metric.lowerBound * 100)}–${Math.round(metric.upperBound * 100)}% 예상 범위`;
  return "측정 대기";
};

const statusLabel = (status: string): string =>
  status === "completed" ? "완료" : status === "failed" ? "실패" : "진행 중";

export const ResumeQualityPage = ({ search }: { search: string }) => {
  const environment = environmentOf(search);
  const page = pageOf(search);
  const [selectedEnvironment, setSelectedEnvironment] =
    useState<ModelEnvironment>(environment);
  const [state, setState] = useState<PageState>({ status: "loading" });
  const queryKey = `${environment}:${page}`;

  useEffect(() => {
    let active = true;
    setSelectedEnvironment(environment);
    setState({ status: "loading" });
    listResumeQualityDashboard({ environment, page, pageSize: 20 })
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
    // queryKey는 필터와 페이지를 반영하며 같은 쿼리의 재렌더링은 재호출하지 않는다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryKey]);

  const items = state.status === "done" ? state.items : [];
  const blockingCount = items.reduce(
    (total, item) =>
      total +
      item.metrics.reduce((sum, metric) => sum + metric.blockingCases, 0),
    0,
  );
  const reviewCount = items.reduce(
    (total, item) =>
      total +
      item.metrics.reduce((sum, metric) => sum + metric.needsReviewCases, 0),
    0,
  );

  return (
    <AdminLayout current="resume-quality">
      <p className="text-xs font-extrabold uppercase tracking-[.14em] text-blue-700">
        MCP 관리자
      </p>
      <h1 className="mb-3 mt-2 text-4xl font-bold tracking-tight">
        이력서 품질 대시보드
      </h1>
      <p className="leading-relaxed text-slate-600">
        PDF 평가의 확인율과 검토 대기·차단 항목을 생성 기록별로 조회합니다.
      </p>

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

      {state.status === "done" && (
        <section
          aria-label="현재 페이지 요약"
          className="mt-6 grid gap-3 sm:grid-cols-3"
        >
          <SummaryCard label="평가 기록" value={`${items.length}건`} />
          <SummaryCard label="검토 대기" value={`${reviewCount}건`} />
          <SummaryCard label="차단 항목" value={`${blockingCount}건`} />
        </section>
      )}

      <section aria-label="품질 평가 목록" className="mt-7 grid gap-4">
        {state.status === "loading" && (
          <p role="status" className="text-sm text-slate-600">
            품질 평가를 불러오는 중입니다.
          </p>
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
        {items.map((item) => (
          <article
            key={`${item.archive.generationId}/${item.archive.attemptId}/${item.evaluationId}`}
            className="rounded-2xl border border-slate-200 bg-white p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <a
                  href={archiveHref(item)}
                  className="font-mono text-sm font-bold text-blue-700 underline underline-offset-4"
                >
                  {item.archive.generationId}
                </a>
                <p className="mt-1 text-xs text-slate-500">
                  실행 {item.archive.attemptId} ·{" "}
                  {statusLabel(item.archive.status)}
                </p>
              </div>
              <p className="text-xs text-slate-500">
                평가 시각 {item.evaluatedAt.replace("T", " ").slice(0, 16)}
              </p>
            </div>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {item.metrics.map((metric) => (
                <li
                  key={metric.metricId}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                >
                  <p className="text-xs font-semibold text-slate-600">
                    {metric.metricId}
                  </p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">
                    {percentage(metric)}
                  </p>
                  <p className="mt-2 text-xs text-slate-600">
                    확인 {metric.passedCases}/{metric.denominator}건 · 검토 대기{" "}
                    {metric.needsReviewCases}건 · 차단 {metric.blockingCases}건
                  </p>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-right text-xs text-slate-500">
              평가 ID {item.evaluationId}
            </p>
          </article>
        ))}
      </section>

      {state.status === "done" && (page > 1 || state.hasMore) && (
        <nav
          aria-label="품질 평가 페이지"
          className="mt-6 flex justify-between"
        >
          {page > 1 ? (
            <a
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold"
              href={`?environment=${environment}&page=${page - 1}`}
            >
              이전
            </a>
          ) : (
            <span />
          )}
          {state.hasMore && (
            <a
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold"
              href={`?environment=${environment}&page=${page + 1}`}
            >
              다음
            </a>
          )}
        </nav>
      )}
    </AdminLayout>
  );
};

const SummaryCard = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-4">
    <p className="text-xs font-semibold text-slate-500">{label}</p>
    <p className="mt-1 text-2xl font-bold">{value}</p>
  </div>
);
