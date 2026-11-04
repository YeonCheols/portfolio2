import { useState } from "react";

import { reproduceArchive } from "../api/archive-api";
import type {
  ArchiveKey,
  ReproductionAction,
  ReproductionRecord,
  ReproductionSource,
  RevisionSummary,
} from "../types";
import { SelectField } from "../ui/select-field";

type ReproductionSectionProps = {
  archiveKey: ArchiveKey;
  revisions: RevisionSummary[];
  history: ReproductionRecord[];
  onRecorded: () => void;
};

type Outcome = {
  record: ReproductionRecord;
  pdfBase64?: string;
  pdfOmitted?: true;
};

const sourceLabel = (source: ReproductionSource): string =>
  source.kind === "original" ? "원본" : `수정본 ${source.revisionId}`;

const actionLabel: Record<ReproductionAction, string> = {
  validate: "검증",
  pdf: "PDF",
};

const errorText = (error: unknown) =>
  error instanceof Error && error.message
    ? error.message
    : "재현을 실행하지 못했습니다.";

const Failure = ({ record }: { record: ReproductionRecord }) => (
  <>
    {record.failedStage && <> · 실패 단계 {record.failedStage}</>}
    {record.errorCode && <> · 오류 {record.errorCode}</>}
  </>
);

export const ReproductionSection = ({
  archiveKey,
  revisions,
  history,
  onRecorded,
}: ReproductionSectionProps) => {
  const [source, setSource] = useState("original");
  const [running, setRunning] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (action: ReproductionAction) => {
    // 진행 중에는 다시 보내지 않는다. 서버도 같은 요청의 중복 실행을 거절한다
    if (running) return;
    setRunning(true);
    setError(null);
    try {
      const result = await reproduceArchive(archiveKey, {
        source:
          source === "original"
            ? { kind: "original" }
            : { kind: "revision", revisionId: source },
        action,
      });
      setOutcome(result);
      onRecorded();
    } catch (cause) {
      setOutcome(null);
      setError(errorText(cause));
    } finally {
      setRunning(false);
    }
  };

  const record = outcome?.record;
  return (
    <section
      aria-label="재현"
      className="mt-4 rounded-2xl border border-slate-200 bg-white p-5"
    >
      <h2 className="text-sm font-bold">재현</h2>
      <p className="mt-1 text-xs text-slate-500">
        보관된 스냅샷과 선택한 응답으로 내부 검증과 PDF 생성만 다시 실행합니다.
        모델과 원문 API는 호출하지 않습니다.
      </p>
      <div className="mt-4 sm:w-80">
        <SelectField
          id="reproduction-source"
          label="재현 원본"
          value={source}
          options={[
            { value: "original", label: "원본 응답" },
            ...revisions.map((revision) => ({
              value: revision.revisionId,
              label: `수정본 ${revision.revisionId}`,
            })),
          ]}
          onChange={setSource}
          disabled={running}
        />
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        {(["validate", "pdf"] as const).map((action) => (
          <button
            key={action}
            type="button"
            disabled={running}
            onClick={() => run(action)}
            className="min-h-11 rounded-xl border border-slate-200 px-5 text-sm font-bold text-slate-700 disabled:cursor-not-allowed disabled:text-slate-400"
          >
            {action === "validate" ? "검증 재현" : "PDF 재현"}
          </button>
        ))}
      </div>
      {running && (
        <p className="mt-3 text-sm text-slate-600" aria-live="polite">
          재현을 실행하는 중입니다.
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {error}
        </p>
      )}
      {record && (
        <div
          role="status"
          className={
            record.status === "completed"
              ? "mt-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
              : "mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          }
        >
          <p className="font-bold">
            {actionLabel[record.action]}{" "}
            {record.status === "completed"
              ? "재현을 완료했습니다."
              : "재현에 실패했습니다."}
            <Failure record={record} />
          </p>
          {record.validation && (
            <p className="mt-1 text-xs">
              문장 {record.validation.claims} · 근거 없음{" "}
              {record.validation.gaps} · 충돌 {record.validation.conflicts} ·
              확인 필요 {record.validation.uncertain}
            </p>
          )}
          {outcome.pdfOmitted && (
            <p className="mt-2 text-xs">
              PDF가 커서 내려받기를 제공하지 않습니다. (
              {Math.round((record.pdf?.byteLength ?? 0) / 1024)}KB)
            </p>
          )}
          {outcome.pdfBase64 && (
            <a
              href={`data:application/pdf;base64,${outcome.pdfBase64}`}
              download={`resume-${record.reproductionId}.pdf`}
              className="mt-2 inline-block font-bold underline"
            >
              PDF 내려받기
            </a>
          )}
        </div>
      )}
      <section aria-label="재현 기록" className="mt-5">
        <h3 className="text-xs font-bold text-slate-500">재현 기록</h3>
        {history.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">재현 기록이 없습니다.</p>
        ) : (
          <ul className="mt-2 grid gap-2">
            {history.map((item) => (
              <li key={item.reproductionId} className="text-xs text-slate-700">
                <time dateTime={item.createdAt}>
                  {new Date(item.createdAt).toLocaleString("ko-KR")}
                </time>
                {" · "}
                {sourceLabel(item.source)} · {actionLabel[item.action]} ·{" "}
                {item.status === "completed" ? "완료" : "실패"}
                <Failure record={item} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
};
