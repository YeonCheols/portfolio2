import { useEffect, useState } from "react";

import { listArchives } from "./api/archive-api";
import type {
  ArchiveStatus,
  ArchiveSummary,
  ModelEnvironment,
} from "../../types";
import { AdminLayout } from "../../shared/ui/admin-layout";
import { SelectField } from "../../shared/ui/select-field";

import {
  debugPagePath,
  detailHref,
  failedStageOptions,
  listHref,
  parseListSearch,
} from "./archive-search";

type ListState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "done"; items: ArchiveSummary[]; hasMore: boolean };

const statusLabel: Record<ArchiveStatus, string> = {
  completed: "완료",
  failed: "실패",
  incomplete: "진행 중",
};

const statusStyle: Record<ArchiveStatus, string> = {
  completed: "bg-green-50 text-green-800",
  failed: "bg-red-50 text-red-800",
  incomplete: "bg-slate-100 text-slate-700",
};

const environmentOptions = [
  { value: "development", label: "개발" },
  { value: "production", label: "운영" },
] as const;

const stageOptions = [
  { value: "", label: "전체" },
  ...failedStageOptions,
] as const;

const fieldClass =
  "mt-2 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 outline-none focus-visible:border-blue-500 focus-visible:ring-4 focus-visible:ring-blue-500/10";

const pageLinkClass =
  "min-h-11 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700";

export const ArchiveListPage = ({ search }: { search: string }) => {
  const query = parseListSearch(search);
  const [state, setState] = useState<ListState>({ status: "loading" });
  // 선택 상자의 값은 GET 폼 제출 때 숨은 입력이 싣는다
  const [environment, setEnvironment] = useState<ModelEnvironment>(
    query.environment,
  );
  const [failedStage, setFailedStage] = useState(query.failedStage ?? "");
  // 조건이 같으면 다시 조회하지 않도록 직렬화한 값으로 효과를 묶는다
  const queryKey = listHref(query, query.page);

  useEffect(() => {
    let active = true;
    setState({ status: "loading" });
    listArchives(query)
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
              : "목록을 불러오지 못했습니다.",
        });
      });
    return () => {
      active = false;
    };
    // query는 queryKey로 직렬화되어 값이 같으면 다시 만들어져도 조회하지 않는다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryKey]);

  return (
    <AdminLayout current="debug-archive">
      <p className="text-xs font-extrabold uppercase tracking-[.14em] text-blue-700">
        MCP 관리자
      </p>
      <h1 className="mb-3 mt-2 text-4xl font-bold tracking-tight">
        이력서 디버깅 아카이브
      </h1>
      <p className="leading-relaxed text-slate-600">
        이력서 생성 요청과 모델 원문 응답, 실패 단계를 비공개 Storage에서
        조회합니다. 최근에 시작한 실행이 먼저 보입니다.
      </p>

      <form
        aria-label="실행 필터"
        action={debugPagePath}
        method="get"
        className="mt-7 grid grid-cols-1 gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:grid-cols-4"
      >
        <SelectField<ModelEnvironment>
          id="filter-environment"
          label="환경"
          value={environment}
          options={environmentOptions}
          onChange={setEnvironment}
        />
        <input type="hidden" name="environment" value={environment} />
        <label className="text-sm font-semibold">
          생성 ID
          <input
            name="generationId"
            defaultValue={query.generationId ?? ""}
            autoComplete="off"
            className={fieldClass}
          />
        </label>
        <label className="text-sm font-semibold">
          실행 ID
          <input
            name="attemptId"
            defaultValue={query.attemptId ?? ""}
            autoComplete="off"
            className={fieldClass}
          />
        </label>
        <SelectField
          id="filter-failed-stage"
          label="실패 단계"
          value={failedStage}
          options={stageOptions}
          onChange={setFailedStage}
        />
        <input type="hidden" name="failedStage" value={failedStage} />
        <div className="sm:col-span-4">
          <button
            type="submit"
            className="min-h-11 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white"
          >
            조회
          </button>
        </div>
      </form>

      <section aria-label="실행 목록" className="mt-7">
        {state.status === "loading" && (
          <p
            role="status"
            aria-live="polite"
            className="text-sm text-slate-600"
          >
            불러오는 중입니다.
          </p>
        )}
        {state.status === "error" && (
          <p
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          >
            {state.message}
          </p>
        )}
        {state.status === "done" && state.items.length === 0 && (
          <p className="rounded-xl border border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-600">
            조건에 맞는 보관 기록이 없습니다.
          </p>
        )}
        {state.status === "done" && state.items.length > 0 && (
          <ul className="grid gap-3">
            {state.items.map((item) => (
              <li
                key={`${item.subjectHash}/${item.generationId}/${item.attemptId}`}
                className="rounded-2xl border border-slate-200 bg-white p-5"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <a
                    href={detailHref({
                      environment: query.environment,
                      subjectHash: item.subjectHash,
                      generationId: item.generationId,
                      attemptId: item.attemptId,
                    })}
                    className="break-all font-mono text-sm font-bold text-blue-700 underline-offset-2 hover:underline"
                  >
                    {item.attemptId}
                  </a>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${statusStyle[item.status]}`}
                  >
                    {statusLabel[item.status]}
                  </span>
                  {item.failedAfter && (
                    <span className="text-xs text-slate-600">
                      {item.failedAfter} 직후 실패
                    </span>
                  )}
                </div>
                <p className="mt-2 break-all text-xs text-slate-600">
                  생성 {item.generationId}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {item.startedAt ? (
                    <time dateTime={item.startedAt}>
                      {new Date(item.startedAt).toLocaleString("ko-KR")}
                    </time>
                  ) : (
                    "시작 시각 없음"
                  )}
                  {" · "}
                  {item.stages.join(" → ")}
                </p>
              </li>
            ))}
          </ul>
        )}
        <nav aria-label="페이지 이동" className="mt-5 flex gap-3">
          {query.page > 1 && (
            <a href={listHref(query, query.page - 1)} className={pageLinkClass}>
              이전 페이지
            </a>
          )}
          {state.status === "done" && state.hasMore && (
            <a href={listHref(query, query.page + 1)} className={pageLinkClass}>
              다음 페이지
            </a>
          )}
        </nav>
      </section>
    </AdminLayout>
  );
};
