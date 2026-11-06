import { useEffect, useRef, useState, type RefObject } from "react";

import {
  callTool,
  listTools,
  setToolEnabled,
  type ToolCallResult,
  type PolicyEnvironment,
  type ToolDefinition,
} from "./api/tool-api";
import { AdminLayout } from "../../shared/ui/admin-layout";
import { formatResultText } from "./format-result";
import { PresetPanel } from "./preset-panel";

type ListState =
  | { status: "loading" }
  | { status: "error" }
  | {
      status: "done";
      tools: ToolDefinition[];
      policyAvailable: boolean;
      environment?: PolicyEnvironment;
    };

type RunState =
  | { status: "idle" }
  | { status: "running"; generationId?: string; copyStatus?: CopyStatus }
  | { status: "invalid" }
  | { status: "failed"; generationId?: string; copyStatus?: CopyStatus }
  | {
      status: "done";
      result: ToolCallResult;
      generationId?: string;
      copyStatus?: CopyStatus;
    };

type CopyStatus = "copied" | "failed";

const generationIdFromResult = (result: ToolCallResult): string | undefined => {
  if (result.isError) return undefined;
  const textEntry = result.content.find((entry) => entry.type === "text");
  const text = textEntry?.type === "text" ? textEntry.text : undefined;
  if (!text) return undefined;
  try {
    const parsed: unknown = JSON.parse(text);
    return typeof parsed === "object" &&
      parsed !== null &&
      "generationId" in parsed &&
      typeof parsed.generationId === "string" &&
      parsed.generationId.trim()
      ? parsed.generationId
      : undefined;
  } catch {
    return undefined;
  }
};

const copyGenerationId = async (generationId: string): Promise<CopyStatus> => {
  try {
    if (!navigator.clipboard?.writeText) return "failed";
    await navigator.clipboard.writeText(generationId);
    return "copied";
  } catch {
    return "failed";
  }
};

const parseArguments = (text: string): Record<string, unknown> | null => {
  try {
    const parsed: unknown = JSON.parse(text.trim() || "{}");
    return typeof parsed === "object" &&
      parsed !== null &&
      !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
};

const sampleText = (sample: Record<string, unknown> | undefined): string =>
  sample ? JSON.stringify(sample, null, 2) : "{}";

type InputTab = "arguments" | "schema";

const tabClass =
  "min-h-11 border-b-2 px-4 text-sm font-bold aria-selected:border-blue-600 aria-selected:text-blue-700 border-transparent text-slate-500 hover:text-slate-800";

const panelClass = "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm";

const ResultPanel = ({
  run,
  panelRef,
  onCopyGenerationId,
}: {
  run: RunState;
  panelRef: RefObject<HTMLElement>;
  onCopyGenerationId: (generationId: string) => void;
}) => (
  <section
    ref={panelRef}
    aria-label="실행 결과"
    className={`${panelClass} lg:sticky lg:top-4`}
  >
    <h3 className="text-sm font-bold text-slate-900">실행 결과</h3>
    {(run.status === "idle" || run.status === "invalid") && (
      <p className="mt-3 rounded-xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
        실행하면 결과가 이곳에 표시됩니다.
      </p>
    )}
    {run.status === "running" && (
      <p
        role="status"
        aria-live="polite"
        className="mt-3 rounded-xl bg-slate-100 p-4 text-sm font-bold text-slate-700"
      >
        실행 중입니다.
      </p>
    )}
    {run.status === "failed" && (
      <p
        role="alert"
        className="mt-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-800"
      >
        도구를 실행하지 못했습니다. 잠시 뒤 다시 시도해 주세요.
      </p>
    )}
    {(run.status === "running" ||
      run.status === "failed" ||
      run.status === "done") &&
      run.generationId && (
        <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50 p-3">
          <p className="text-xs font-bold text-blue-900">generationId</p>
          <code className="mt-1 block break-all text-xs text-blue-900">
            {run.generationId}
          </code>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <p role="status" className="text-xs text-blue-800">
              {run.copyStatus === "copied"
                ? "generationId를 클립보드에 복사했습니다."
                : "자동 복사에 실패했습니다. 다시 복사할 수 있습니다."}
            </p>
            {run.copyStatus !== "copied" && (
              <button
                type="button"
                onClick={() => onCopyGenerationId(run.generationId!)}
                className="min-h-9 rounded-lg border border-blue-200 bg-white px-3 text-xs font-bold text-blue-800"
              >
                generationId 복사
              </button>
            )}
          </div>
        </div>
      )}
    {run.status === "done" && (
      <div aria-live="polite" className="mt-3">
        <p
          className={
            run.result.isError
              ? "inline-block rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-800"
              : "inline-block rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-800"
          }
        >
          {run.result.isError ? "실패" : "성공"}
        </p>
        {run.result.content.map((entry, index) => (
          <pre
            key={index}
            className="mt-2 max-h-[32rem] overflow-auto whitespace-pre-wrap break-words rounded-xl bg-slate-50 p-3 text-xs text-slate-800"
          >
            {entry.type === "text"
              ? formatResultText(entry.text)
              : `${entry.mimeType} ${entry.byteLength}바이트 (${entry.uri})`}
          </pre>
        ))}
      </div>
    )}
  </section>
);

const ToolRunner = ({
  name,
  schema,
  sample,
  initialRun,
  initialArguments,
  onAutoPdfRun,
}: {
  name: string;
  schema: unknown;
  sample?: Record<string, unknown>;
  initialRun?: RunState;
  initialArguments?: Record<string, unknown>;
  onAutoPdfRun?: (generationId: string, run: RunState) => void;
}) => {
  const [text, setText] = useState(() =>
    initialArguments ? sampleText(initialArguments) : sampleText(sample),
  );
  const [run, setRun] = useState<RunState>(initialRun ?? { status: "idle" });
  const [tab, setTab] = useState<InputTab>("arguments");
  const resultRef = useRef<HTMLElement>(null);
  const running = run.status === "running";

  const updateCopyStatus = (generationId: string, copyStatus: CopyStatus) =>
    setRun((current) =>
      current.status === "done" ||
      current.status === "failed" ||
      current.status === "running"
        ? { ...current, generationId, copyStatus }
        : current,
    );

  const copyForResult = (generationId: string) => {
    void copyGenerationId(generationId).then((copyStatus) =>
      updateCopyStatus(generationId, copyStatus),
    );
  };

  // 좁은 화면에서는 결과가 입력 아래에 놓이므로 끝나면 결과 위치로 가져온다
  useEffect(() => {
    if (run.status === "done" || run.status === "failed")
      resultRef.current?.scrollIntoView?.({ block: "nearest" });
  }, [run.status]);

  const execute = () => {
    // 중복 클릭은 첫 요청이 끝날 때까지 무시한다
    if (running) return;
    const args = parseArguments(text);
    if (!args) {
      setRun({ status: "invalid" });
      return;
    }
    setRun({ status: "running" });
    callTool(name, args)
      .then(async (result) => {
        const generationId =
          name === "generate_resume"
            ? generationIdFromResult(result)
            : undefined;
        if (!generationId) {
          setRun({ status: "done", result });
          return;
        }

        const copyStatus = await copyGenerationId(generationId);
        if (!onAutoPdfRun) {
          setRun({ status: "done", result, generationId, copyStatus });
          return;
        }

        onAutoPdfRun(generationId, {
          status: "running",
          generationId,
          copyStatus,
        });
        try {
          const pdfResult = await callTool("convert_resume_to_pdf", {
            generationId,
          });
          onAutoPdfRun(generationId, {
            status: "done",
            result: pdfResult,
            generationId,
            copyStatus,
          });
        } catch {
          onAutoPdfRun(generationId, {
            status: "failed",
            generationId,
            copyStatus,
          });
        }
      })
      .catch(() => setRun({ status: "failed" }));
  };

  return (
    <div className="mt-4 grid items-start gap-4 lg:grid-cols-2">
      <section aria-label="입력" className={panelClass}>
        <div
          role="tablist"
          aria-label="입력 보기"
          className="flex border-b border-slate-200"
        >
          <button
            type="button"
            role="tab"
            id={`tab-args-${name}`}
            aria-selected={tab === "arguments"}
            aria-controls={`panel-${name}`}
            onClick={() => setTab("arguments")}
            className={tabClass}
          >
            입력 인자
          </button>
          <button
            type="button"
            role="tab"
            id={`tab-schema-${name}`}
            aria-selected={tab === "schema"}
            aria-controls={`panel-${name}`}
            onClick={() => setTab("schema")}
            className={tabClass}
          >
            입력 스키마
          </button>
        </div>
        <div
          role="tabpanel"
          id={`panel-${name}`}
          aria-labelledby={`tab-${tab === "arguments" ? "args" : "schema"}-${name}`}
          className="mt-3"
        >
          {tab === "schema" ? (
            <pre className="max-h-[32rem] overflow-auto rounded-xl bg-slate-50 p-3 text-xs text-slate-800">
              {JSON.stringify(schema, null, 2)}
            </pre>
          ) : (
            <>
              <label className="block text-sm font-bold text-slate-900">
                입력 인자(JSON)
                <textarea
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  rows={14}
                  spellCheck={false}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 font-mono text-xs text-slate-900 outline-none focus-visible:border-blue-500 focus-visible:ring-4 focus-visible:ring-blue-500/10"
                />
              </label>
              {run.status === "invalid" && (
                <p role="alert" className="mt-2 text-sm font-bold text-red-700">
                  입력 인자는 JSON 객체여야 합니다.
                </p>
              )}
            </>
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setText(sampleText(sample));
              setRun({ status: "idle" });
              setTab("arguments");
            }}
            disabled={running}
            className="min-h-11 rounded-xl border border-slate-200 px-5 text-sm font-bold text-slate-700 disabled:cursor-not-allowed disabled:text-slate-400"
          >
            샘플 입력으로 되돌리기
          </button>
          <button
            type="button"
            onClick={() => {
              setTab("arguments");
              execute();
            }}
            disabled={running}
            className="min-h-11 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {running ? "실행 중입니다" : "실행"}
          </button>
        </div>
        <PresetPanel
          toolName={name}
          readArguments={() => parseArguments(text)}
          onLoad={(args) => {
            setText(JSON.stringify(args, null, 2));
            setRun({ status: "idle" });
            setTab("arguments");
          }}
        />
      </section>
      <ResultPanel
        run={run}
        panelRef={resultRef}
        onCopyGenerationId={copyForResult}
      />
    </div>
  );
};

const EnvironmentBadge = ({
  environment,
}: {
  environment: PolicyEnvironment;
}) => (
  <span
    aria-label="정책 환경"
    className={
      environment === "production"
        ? "rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900"
        : "rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-800"
    }
  >
    {environment === "production" ? "운영" : "개발"}
  </span>
);

const StatusBadge = ({ enabled }: { enabled?: boolean }) =>
  enabled === undefined ? null : (
    <span
      className={
        enabled
          ? "shrink-0 rounded-full bg-green-50 px-2 py-0.5 text-xs font-bold text-green-800"
          : "shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600"
      }
    >
      {enabled ? "활성" : "비활성"}
    </span>
  );

const EnabledSwitch = ({
  enabled,
  available,
  onChange,
}: {
  enabled: boolean | undefined;
  available: boolean;
  onChange: (next: boolean) => Promise<void>;
}) => {
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const checked = enabled === true;

  const toggle = () => {
    // 저장이 끝나기 전의 반복 클릭은 무시한다
    if (pending || !available) return;
    setPending(true);
    setFailed(false);
    onChange(!checked)
      .catch(() => setFailed(true))
      .finally(() => setPending(false));
  };

  return (
    <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <span
          id="tool-enabled-label"
          className="text-sm font-bold text-slate-900"
        >
          도구 활성
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          aria-labelledby="tool-enabled-label"
          disabled={pending || !available}
          onClick={toggle}
          className="relative h-7 w-12 shrink-0 rounded-full bg-slate-300 transition-colors aria-checked:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span
            className={`absolute left-0.5 top-0.5 size-6 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-5" : ""}`}
          />
        </button>
      </div>
      <p className="mt-2 text-xs text-slate-600">
        {available
          ? "끄면 AI 클라이언트의 도구 목록에서 빠지고 호출이 거절됩니다. 이 화면의 시험 실행은 꺼 둔 도구도 계속 할 수 있습니다. 다른 서버 인스턴스에는 최대 10초 뒤 반영됩니다."
          : "정책 저장소를 쓸 수 없어 활성 상태를 확인하거나 바꿀 수 없습니다."}
      </p>
      {failed && (
        <p role="alert" className="mt-2 text-sm font-bold text-red-700">
          활성 상태를 바꾸지 못했습니다. 잠시 뒤 다시 시도해 주세요.
        </p>
      )}
    </div>
  );
};

export const ToolListPage = () => {
  const [state, setState] = useState<ListState>({ status: "loading" });
  const [selected, setSelected] = useState<string | null>(null);
  const [autoPdfRun, setAutoPdfRun] = useState<{
    generationId: string;
    run: RunState;
  } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    listTools(controller.signal)
      .then(({ tools, policyAvailable, environment }) =>
        setState({ status: "done", tools, policyAvailable, environment }),
      )
      .catch(() => {
        // 중단은 화면을 떠난 것이라 오류로 보여주지 않는다
        if (controller.signal.aborted) return;
        setState({ status: "error" });
      });
    return () => controller.abort();
  }, []);

  const tool =
    state.status === "done"
      ? state.tools.find((entry) => entry.name === selected)
      : undefined;
  const hasPdfTool =
    state.status === "done" &&
    state.tools.some((entry) => entry.name === "convert_resume_to_pdf");

  return (
    <AdminLayout current="resume-tools" wide>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-bold text-slate-900">이력서 툴 관리</h1>
        {state.status === "done" && state.environment && (
          <EnvironmentBadge environment={state.environment} />
        )}
      </div>
      {state.status === "loading" && (
        <p
          role="status"
          aria-live="polite"
          className="mt-4 text-sm text-slate-600"
        >
          도구 목록을 불러오는 중입니다.
        </p>
      )}
      {state.status === "error" && (
        <p role="alert" className="mt-4 text-sm font-bold text-red-700">
          도구 목록을 불러오지 못했습니다. 잠시 뒤 다시 시도해 주세요.
        </p>
      )}
      {state.status === "done" && state.tools.length === 0 && (
        <p className="mt-4 text-sm text-slate-600">표시할 도구가 없습니다.</p>
      )}
      {state.status === "done" && state.tools.length > 0 && (
        <div className="mt-4 grid items-start gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
          <ul aria-label="도구 목록" className="grid content-start gap-3">
            {state.tools.map((entry) => (
              <li key={entry.name}>
                <button
                  type="button"
                  aria-pressed={entry.name === selected}
                  onClick={() => setSelected(entry.name)}
                  className="flex min-h-20 w-full flex-col gap-1 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-colors hover:border-blue-500 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/10 aria-pressed:border-blue-600 aria-pressed:bg-blue-50 aria-pressed:ring-2 aria-pressed:ring-blue-600/20"
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="block text-sm font-bold text-slate-900">
                      {entry.name}
                    </span>
                    <StatusBadge enabled={entry.enabled} />
                  </span>
                  <span className="block text-xs text-slate-600">
                    {entry.description}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {tool ? (
            <section aria-label={`${tool.name} 상세`}>
              <h2 className="text-base font-bold text-slate-900">
                {tool.name}
              </h2>
              <p className="mt-1 text-sm text-slate-600">{tool.description}</p>
              <EnabledSwitch
                key={`switch-${tool.name}`}
                enabled={tool.enabled}
                available={state.policyAvailable}
                onChange={async (next) => {
                  await setToolEnabled(tool.name, next);
                  setState((current) =>
                    current.status === "done"
                      ? {
                          ...current,
                          tools: current.tools.map((entry) =>
                            entry.name === tool.name
                              ? { ...entry, enabled: next }
                              : entry,
                          ),
                        }
                      : current,
                  );
                }}
              />
              <ToolRunner
                key={`${tool.name}-${tool.name === "convert_resume_to_pdf" ? (autoPdfRun?.run.status ?? "idle") : "idle"}`}
                name={tool.name}
                schema={tool.inputSchema}
                sample={tool.sampleArguments}
                initialRun={
                  tool.name === "convert_resume_to_pdf"
                    ? autoPdfRun?.run
                    : undefined
                }
                initialArguments={
                  tool.name === "convert_resume_to_pdf" && autoPdfRun
                    ? { generationId: autoPdfRun.generationId }
                    : undefined
                }
                onAutoPdfRun={
                  tool.name === "generate_resume" && hasPdfTool
                    ? (generationId, run) => {
                        setAutoPdfRun({ generationId, run });
                        setSelected("convert_resume_to_pdf");
                      }
                    : undefined
                }
              />
            </section>
          ) : (
            <p className="rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
              왼쪽 목록에서 도구를 선택하세요.
            </p>
          )}
        </div>
      )}
    </AdminLayout>
  );
};
