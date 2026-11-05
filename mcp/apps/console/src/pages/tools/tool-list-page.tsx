import { useEffect, useRef, useState, type RefObject } from "react";

import {
  callTool,
  listTools,
  type ToolCallResult,
  type ToolDefinition,
} from "./api/tool-api";
import { AdminLayout } from "../../shared/ui/admin-layout";

type ListState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "done"; tools: ToolDefinition[] };

type RunState =
  | { status: "idle" }
  | { status: "running" }
  | { status: "invalid" }
  | { status: "failed" }
  | { status: "done"; result: ToolCallResult };

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
}: {
  run: RunState;
  panelRef: RefObject<HTMLElement>;
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
              ? entry.text
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
}: {
  name: string;
  schema: unknown;
  sample?: Record<string, unknown>;
}) => {
  const [text, setText] = useState(() => sampleText(sample));
  const [run, setRun] = useState<RunState>({ status: "idle" });
  const [tab, setTab] = useState<InputTab>("arguments");
  const resultRef = useRef<HTMLElement>(null);
  const running = run.status === "running";

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
      .then((result) => setRun({ status: "done", result }))
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
      </section>
      <ResultPanel run={run} panelRef={resultRef} />
    </div>
  );
};

export const ToolListPage = () => {
  const [state, setState] = useState<ListState>({ status: "loading" });
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    listTools(controller.signal)
      .then((tools) => setState({ status: "done", tools }))
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

  return (
    <AdminLayout current="resume-tools" wide>
      <h1 className="text-xl font-bold text-slate-900">이력서 툴 관리</h1>
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
                  <span className="block text-sm font-bold text-slate-900">
                    {entry.name}
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
              <ToolRunner
                key={tool.name}
                name={tool.name}
                schema={tool.inputSchema}
                sample={tool.sampleArguments}
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
