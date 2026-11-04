import { useEffect, useRef, useState } from "react";

import { getArchiveDetail, getArchiveFileUrl } from "../api/archive-api";
import type { ArchiveDetail, ArchiveKey, ArchiveStatus } from "../types";
import { AdminLayout } from "../ui/admin-layout";

import { listHref } from "./archive-search";

type DetailState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "done"; detail: ArchiveDetail };

const statusLabel: Record<ArchiveStatus, string> = {
  completed: "완료",
  failed: "실패",
  incomplete: "진행 중",
};

const errorText = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

const record = (value: unknown): Record<string, unknown> =>
  typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {};

const asJson = (value: unknown): string | null =>
  value === undefined ? null : JSON.stringify(value, null, 2);

const Block = ({ title, text }: { title: string; text: string | null }) => (
  <section
    aria-label={title}
    className="mt-4 rounded-2xl border border-slate-200 bg-white p-5"
  >
    <h2 className="text-sm font-bold">{title}</h2>
    {text === null ? (
      <p className="mt-2 text-sm text-slate-500">저장된 값이 없습니다.</p>
    ) : (
      <>
        <p className="mt-1 text-xs text-slate-500">{text.length}자</p>
        {/* 원문은 해석하지 않고 텍스트로만 보여준다. 길면 영역 안에서 스크롤한다 */}
        <pre className="mt-2 max-h-96 overflow-auto whitespace-pre-wrap break-all rounded-xl bg-slate-50 p-4 font-mono text-xs leading-relaxed text-slate-800">
          {text}
        </pre>
      </>
    )}
  </section>
);

export const ArchiveDetailPage = ({
  archiveKey,
}: {
  archiveKey: ArchiveKey;
}) => {
  const [state, setState] = useState<DetailState>({ status: "loading" });
  const [opening, setOpening] = useState<ReadonlySet<string>>(new Set());
  const [fileErrors, setFileErrors] = useState<Record<string, string>>({});
  const mounted = useRef(true);
  const { environment, subjectHash, generationId, attemptId } = archiveKey;

  useEffect(() => {
    mounted.current = true;
    setState({ status: "loading" });
    getArchiveDetail({ environment, subjectHash, generationId, attemptId })
      .then((detail) => {
        if (mounted.current) setState({ status: "done", detail });
      })
      .catch((error: unknown) => {
        if (!mounted.current) return;
        setState({
          status: "error",
          message: errorText(error, "상세를 불러오지 못했습니다."),
        });
      });
    return () => {
      mounted.current = false;
    };
  }, [environment, subjectHash, generationId, attemptId]);

  const openFile = async (name: string) => {
    if (opening.has(name)) return;
    setOpening((current) => new Set(current).add(name));
    setFileErrors(({ [name]: _removed, ...rest }) => rest);
    try {
      const url = await getArchiveFileUrl(archiveKey, name);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) {
      if (mounted.current) {
        setFileErrors((current) => ({
          ...current,
          [name]: errorText(error, "파일을 열지 못했습니다."),
        }));
      }
    } finally {
      if (mounted.current) {
        setOpening((current) => {
          const next = new Set(current);
          next.delete(name);
          return next;
        });
      }
    }
  };

  return (
    <AdminLayout current="debug">
      <a
        href={listHref({ environment }, 1)}
        className="text-sm font-bold text-blue-700 underline-offset-2 hover:underline"
      >
        목록으로
      </a>
      <h1 className="mb-3 mt-3 text-4xl font-bold tracking-tight">실행 상세</h1>

      {state.status === "loading" && (
        <p role="status" aria-live="polite" className="text-sm text-slate-600">
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
      {state.status === "done" && (
        <DetailBody
          detail={state.detail}
          environment={environment}
          opening={opening}
          fileErrors={fileErrors}
          onOpen={openFile}
        />
      )}
    </AdminLayout>
  );
};

const DetailBody = ({
  detail,
  environment,
  opening,
  fileErrors,
  onOpen,
}: {
  detail: ArchiveDetail;
  environment: string;
  opening: ReadonlySet<string>;
  fileErrors: Record<string, string>;
  onOpen: (name: string) => void;
}) => {
  const { summary, files } = detail;
  const latest = record(detail.latest);
  const errorCode =
    typeof latest.errorCode === "string" ? latest.errorCode : null;
  return (
    <>
      <dl className="mt-5 grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-white p-5 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs font-bold text-slate-500">환경</dt>
          <dd>{environment === "production" ? "운영" : "개발"}</dd>
        </div>
        <div>
          <dt className="text-xs font-bold text-slate-500">상태</dt>
          <dd>
            {statusLabel[summary.status]}
            {summary.failedAfter && (
              <span className="ml-2 text-xs text-slate-600">
                {summary.failedAfter} 직후 실패
              </span>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-bold text-slate-500">생성 ID</dt>
          <dd className="break-all font-mono text-xs">
            {summary.generationId}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-bold text-slate-500">실행 ID</dt>
          <dd className="break-all font-mono text-xs">{summary.attemptId}</dd>
        </div>
        <div>
          <dt className="text-xs font-bold text-slate-500">시작 시각</dt>
          <dd>
            {summary.startedAt ? (
              <time dateTime={summary.startedAt}>
                {new Date(summary.startedAt).toLocaleString("ko-KR")}
              </time>
            ) : (
              "없음"
            )}
          </dd>
        </div>
        {errorCode && (
          <div>
            <dt className="text-xs font-bold text-slate-500">오류 코드</dt>
            <dd className="font-mono text-xs">{errorCode}</dd>
          </div>
        )}
      </dl>

      <Block title="요청 페이로드" text={asJson(latest.request)} />
      <Block
        title="모델 원문 응답"
        text={typeof latest.response === "string" ? latest.response : null}
      />
      <Block title="검증 결과" text={asJson(latest.validation)} />

      <section
        aria-label="단계 파일"
        className="mt-4 rounded-2xl border border-slate-200 bg-white p-5"
      >
        <h2 className="text-sm font-bold">단계 파일</h2>
        <ul className="mt-3 grid gap-2">
          {files.map((file) => (
            <li key={file.name} className="text-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="font-mono text-xs">{file.name}</span>
                <button
                  type="button"
                  disabled={opening.has(file.name)}
                  aria-label={`${file.name} 원본 열기`}
                  onClick={() => onOpen(file.name)}
                  className="min-h-11 rounded-xl border border-slate-200 px-4 text-xs font-bold text-slate-700 disabled:cursor-not-allowed disabled:text-slate-400"
                >
                  {opening.has(file.name) ? "여는 중" : "원본 열기"}
                </button>
              </div>
              {fileErrors[file.name] && (
                <p
                  role="alert"
                  className="mt-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800"
                >
                  {fileErrors[file.name]}
                </p>
              )}
            </li>
          ))}
        </ul>
      </section>
    </>
  );
};
