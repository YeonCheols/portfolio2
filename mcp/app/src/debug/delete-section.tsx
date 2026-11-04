import { useState } from "react";

import { removeArchive } from "../api/archive-api";
import type { ArchiveKey } from "../types";

import { listHref } from "./archive-search";

export const DeleteSection = ({ archiveKey }: { archiveKey: ArchiveKey }) => {
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setConfirming(false);
    setTyped("");
    setError(null);
  };

  const remove = async () => {
    if (busy || typed !== archiveKey.attemptId) return;
    setBusy(true);
    setError(null);
    try {
      await removeArchive(archiveKey, typed);
      window.location.assign(
        listHref({ environment: archiveKey.environment }, 1),
      );
    } catch (cause) {
      setError(
        cause instanceof Error && cause.message
          ? cause.message
          : "삭제하지 못했습니다.",
      );
      setBusy(false);
    }
  };

  return (
    <section
      aria-label="삭제"
      className="mt-4 rounded-2xl border border-red-200 bg-white p-5"
    >
      <h2 className="text-sm font-bold text-red-800">삭제</h2>
      {!confirming ? (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="mt-3 min-h-11 rounded-xl border border-red-200 px-5 text-sm font-bold text-red-800"
        >
          이 실행 삭제
        </button>
      ) : (
        <div className="mt-3">
          <p className="text-sm text-slate-700">
            실행{" "}
            <span className="font-mono text-xs">{archiveKey.attemptId}</span>의
            단계 파일, 수정본, 재현 기록이 모두 삭제되며 되돌릴 수 없습니다.
            다른 실행은 그대로 남습니다.
          </p>
          <label
            htmlFor="delete-confirm"
            className="mt-3 block text-sm font-semibold"
          >
            삭제할 실행 ID 입력
          </label>
          <input
            id="delete-confirm"
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            autoComplete="off"
            className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 px-3 font-mono text-sm outline-none focus-visible:border-red-500 focus-visible:ring-4 focus-visible:ring-red-500/10 sm:w-96"
          />
          <div className="mt-3 flex gap-3">
            <button
              type="button"
              disabled={busy || typed !== archiveKey.attemptId}
              onClick={remove}
              className="min-h-11 rounded-xl bg-red-600 px-5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              삭제 확정
            </button>
            <button
              type="button"
              onClick={close}
              className="min-h-11 rounded-xl border border-slate-200 px-5 text-sm font-bold text-slate-700"
            >
              취소
            </button>
          </div>
          {error && (
            <p
              role="alert"
              className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
            >
              {error}
            </p>
          )}
        </div>
      )}
    </section>
  );
};
