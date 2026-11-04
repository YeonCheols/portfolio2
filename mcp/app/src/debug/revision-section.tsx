import { useState } from "react";

import { getRevision, saveRevision } from "../api/archive-api";
import type { ArchiveDetail, ArchiveKey, RevisionSummary } from "../types";

type RevisionSectionProps = {
  archiveKey: ArchiveKey;
  detail: ArchiveDetail;
  revisions: RevisionSummary[];
  onSaved: () => void;
};

type Message = { text: string; isError: boolean };

const fieldClass =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 font-mono text-xs leading-relaxed text-slate-900 outline-none focus-visible:border-blue-500 focus-visible:ring-4 focus-visible:ring-blue-500/10";

const errorText = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

const requestText = (value: unknown): string =>
  value === undefined ? "" : JSON.stringify(value, null, 2);

export const RevisionSection = ({
  archiveKey,
  detail,
  revisions,
  onSaved,
}: RevisionSectionProps) => {
  const latest =
    typeof detail.latest === "object" && detail.latest !== null
      ? (detail.latest as Record<string, unknown>)
      : {};
  const [response, setResponse] = useState(
    typeof latest.response === "string" ? latest.response : "",
  );
  const [request, setRequest] = useState(requestText(latest.request));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);
  // 수정본은 가장 마지막 단계 기록을 기준으로 삼는다
  const baseFile = detail.files[detail.files.length - 1]?.name ?? "";

  const save = async () => {
    if (busy) return;
    let parsedRequest: unknown;
    if (request.trim()) {
      try {
        parsedRequest = JSON.parse(request);
      } catch {
        setMessage({
          text: "요청 페이로드가 올바른 JSON이 아닙니다.",
          isError: true,
        });
        return;
      }
    }
    setBusy(true);
    setMessage(null);
    try {
      const revisionId = await saveRevision(archiveKey, {
        baseFile,
        ...(parsedRequest !== undefined ? { request: parsedRequest } : {}),
        response,
      });
      setMessage({
        text: `수정본을 저장했습니다. (${revisionId})`,
        isError: false,
      });
      onSaved();
    } catch (error) {
      setMessage({
        text: errorText(error, "수정본을 저장하지 못했습니다."),
        isError: true,
      });
    } finally {
      setBusy(false);
    }
  };

  const load = async (revisionId: string) => {
    setMessage(null);
    try {
      const revision = await getRevision(archiveKey, revisionId);
      setResponse(revision.response);
      setRequest(requestText(revision.request));
    } catch (error) {
      setMessage({
        text: errorText(error, "수정본을 불러오지 못했습니다."),
        isError: true,
      });
    }
  };

  return (
    <section
      aria-label="수정본 편집"
      className="mt-4 rounded-2xl border border-slate-200 bg-white p-5"
    >
      <h2 className="text-sm font-bold">수정본 편집</h2>
      <p className="mt-1 text-xs text-slate-500">
        원본 기록은 바뀌지 않고 수정본은 별도 객체로 저장됩니다. 저장하기 전에
        응답 JSON과 출처 참조를 서버가 검증합니다.
      </p>
      <label
        htmlFor="revision-response"
        className="mt-4 block text-sm font-semibold"
      >
        수정할 응답
      </label>
      <textarea
        id="revision-response"
        value={response}
        onChange={(event) => setResponse(event.target.value)}
        rows={10}
        spellCheck={false}
        className={fieldClass}
      />
      <label
        htmlFor="revision-request"
        className="mt-4 block text-sm font-semibold"
      >
        수정할 요청 페이로드
      </label>
      <textarea
        id="revision-request"
        value={request}
        onChange={(event) => setRequest(event.target.value)}
        rows={6}
        spellCheck={false}
        className={fieldClass}
      />
      <button
        type="button"
        disabled={busy}
        onClick={save}
        className="mt-4 min-h-11 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        수정본으로 저장
      </button>
      {message && (
        <p
          role={message.isError ? "alert" : "status"}
          className={
            message.isError
              ? "mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
              : "mt-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
          }
        >
          {message.text}
        </p>
      )}
      <h3 className="mt-5 text-xs font-bold text-slate-500">저장된 수정본</h3>
      {revisions.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500">저장된 수정본이 없습니다.</p>
      ) : (
        <ul className="mt-2 grid gap-2">
          {revisions.map((revision) => (
            <li
              key={revision.revisionId}
              className="flex flex-wrap items-center justify-between gap-3 text-sm"
            >
              <span className="font-mono text-xs">
                {revision.revisionId}
                {revision.createdAt && (
                  <time
                    dateTime={revision.createdAt}
                    className="ml-2 text-slate-500"
                  >
                    {new Date(revision.createdAt).toLocaleString("ko-KR")}
                  </time>
                )}
              </span>
              <button
                type="button"
                aria-label={`${revision.revisionId} 불러오기`}
                onClick={() => load(revision.revisionId)}
                className="min-h-11 rounded-xl border border-slate-200 px-4 text-xs font-bold text-slate-700"
              >
                불러오기
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
