import type {
  ConnectionTestResult,
  ConnectionTestState,
  ModelSetting,
} from "../../types";

import {
  connectionTestMessage,
  structuredMessage,
} from "./connection-test-message";

type SettingCardProps = {
  setting: ModelSetting;
  testState?: ConnectionTestState;
  onTest: (setting: ModelSetting) => void;
  onActivate: (setting: ModelSetting) => void;
  onEdit: (setting: ModelSetting) => void;
  onDelete: (setting: ModelSetting) => void;
};

export const SettingCard = ({
  setting,
  testState,
  onTest,
  onActivate,
  onEdit,
  onDelete,
}: SettingCardProps) => (
  <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h3 className="break-all text-sm font-bold">{setting.modelName}</h3>
      <span
        className={
          setting.isActive
            ? "rounded-full bg-green-100 px-2.5 py-1 text-xs font-bold text-green-800"
            : "rounded-full bg-slate-200 px-2.5 py-1 text-xs font-bold text-slate-700"
        }
      >
        {setting.isActive ? "활성" : "비활성"}
      </span>
    </div>
    <dl className="mt-3 space-y-1 break-all text-xs text-slate-600">
      <div>공급자: {setting.provider}</div>
      <div>API 키: {setting.hasApiKey ? "등록됨" : "미등록"}</div>
    </dl>
    <div className="mt-4 flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => onTest(setting)}
        disabled={testState?.status === "running"}
        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 disabled:opacity-60"
      >
        {testState?.status === "running" ? "테스트 중..." : "연결 테스트"}
      </button>
      {setting.isActive ? (
        <span className="text-xs font-semibold text-green-800">
          현재 환경에서 사용 중인 설정입니다.
        </span>
      ) : (
        <>
          <button
            type="button"
            onClick={() => onActivate(setting)}
            disabled={!setting.hasApiKey}
            className="rounded-lg border border-blue-200 px-3 py-2 text-xs font-bold text-blue-700"
          >
            활성화
          </button>
          <button
            type="button"
            onClick={() => onEdit(setting)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700"
          >
            수정
          </button>
          <button
            type="button"
            onClick={() => onDelete(setting)}
            className="rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-700"
          >
            삭제
          </button>
        </>
      )}
    </div>
    {testState && (
      <p
        role="status"
        aria-live="polite"
        className="mt-3 text-xs font-semibold text-slate-700"
      >
        {connectionTestMessage(testState)}
      </p>
    )}
    {testState?.status === "done" && testState.result.ok && (
      <TestDetails result={testState.result} />
    )}
  </article>
);

type SuccessResult = Extract<ConnectionTestResult, { ok: true }>;

// 구조화 응답 확인 결과와 공급자 응답 원문. 원문은 접어 두고 텍스트로만 그려 마크업이 실행되지 않게 한다
const TestDetails = ({ result }: { result: SuccessResult }) => {
  const { structured } = result;
  const responses = [
    { label: "일반 응답", value: result.response },
    { label: "구조화 응답", value: structured?.response },
  ].filter(({ value }) => value !== undefined);

  return (
    <>
      {structured && (
        <p className="mt-1 text-xs text-slate-600">
          {structuredMessage(structured)}
        </p>
      )}
      {responses.length > 0 && (
        <details className="mt-2 text-xs text-slate-700">
          <summary className="cursor-pointer font-semibold">
            응답 원문 보기
          </summary>
          {responses.map(({ label, value }) => (
            <div key={label} className="mt-2">
              <p className="font-semibold">{label}</p>
              <pre className="mt-1 max-h-60 overflow-auto whitespace-pre-wrap break-all rounded-md bg-slate-100 p-2 text-[11px] leading-4">
                {JSON.stringify(value, null, 2)}
              </pre>
            </div>
          ))}
        </details>
      )}
    </>
  );
};
