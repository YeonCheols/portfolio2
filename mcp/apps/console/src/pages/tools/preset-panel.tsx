import { useCallback, useEffect, useState } from "react";

import { LoadingSpinner } from "../../shared/ui/loading-spinner";
import {
  ApiError,
  deletePreset,
  listPresets,
  savePreset,
  type ToolPreset,
} from "./api/tool-api";

type ListState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "unavailable" }
  | { status: "done"; presets: ToolPreset[] };

type Message = { kind: "error" | "notice"; text: string } | null;

const saveErrorText = (error: unknown): string => {
  const code = error instanceof ApiError ? error.code : undefined;
  if (code === "PRESET_LIMIT")
    return "프리셋은 도구당 30개까지 저장할 수 있습니다.";
  if (code === "PRESET_TOO_LARGE")
    return "입력이 너무 커서 저장할 수 없습니다. 64KB 이하로 줄여 주세요.";
  if (code === "PRESET_XML_NOT_ALLOWED")
    return "샘플과 다른 XML은 프리셋에 저장할 수 없습니다. XML을 샘플로 되돌리거나 지운 뒤 저장해 주세요.";
  if (code === "INVALID_PRESET")
    return "프리셋 이름 또는 입력이 올바르지 않습니다.";
  return "프리셋을 저장하지 못했습니다. 잠시 뒤 다시 시도해 주세요.";
};

const rowButtonClass =
  "min-h-11 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-700 disabled:cursor-not-allowed disabled:text-slate-400";

export const PresetPanel = ({
  toolName,
  readArguments,
  onLoad,
}: {
  toolName: string;
  // 입력란의 현재 인자. JSON 객체가 아니면 null이다
  readArguments: () => Record<string, unknown> | null;
  onLoad: (args: Record<string, unknown>) => void;
}) => {
  const [list, setList] = useState<ListState>({ status: "loading" });
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<Message>(null);
  const [confirming, setConfirming] = useState<string | null>(null);

  const reload = useCallback(
    (signal?: AbortSignal) =>
      listPresets(toolName, signal)
        .then((presets) => setList({ status: "done", presets }))
        .catch((error: unknown) => {
          if (signal?.aborted) return;
          setList(
            error instanceof ApiError &&
              error.code === "TOOL_PRESETS_UNAVAILABLE"
              ? { status: "unavailable" }
              : { status: "error" },
          );
        }),
    [toolName],
  );

  useEffect(() => {
    const controller = new AbortController();
    void reload(controller.signal);
    return () => controller.abort();
  }, [reload]);

  // 저장한 인자를 바꾸지 않고 그대로 입력란에 돌려준다
  const load = (preset: ToolPreset) => {
    onLoad(preset.arguments);
    setMessage(null);
  };

  const save = () => {
    if (busy) return;
    const name = label.trim();
    if (!name) {
      setMessage({ kind: "error", text: "프리셋 이름을 입력해 주세요." });
      return;
    }
    const args = readArguments();
    if (!args) {
      setMessage({ kind: "error", text: "입력 인자는 JSON 객체여야 합니다." });
      return;
    }
    setBusy(true);
    setMessage(null);
    savePreset(toolName, name, args)
      .then(async () => {
        setLabel("");
        setMessage(null);
        await reload();
      })
      .catch((error: unknown) =>
        setMessage({ kind: "error", text: saveErrorText(error) }),
      )
      .finally(() => setBusy(false));
  };

  const remove = (id: string) => {
    if (busy) return;
    setBusy(true);
    setMessage(null);
    deletePreset(toolName, id)
      .then(async () => {
        setConfirming(null);
        await reload();
      })
      .catch(() =>
        setMessage({
          kind: "error",
          text: "프리셋을 삭제하지 못했습니다. 잠시 뒤 다시 시도해 주세요.",
        }),
      )
      .finally(() => setBusy(false));
  };

  const unavailable = list.status === "unavailable";

  return (
    <section
      aria-label="프리셋"
      className="mt-4 border-t border-slate-200 pt-4"
    >
      <h3 className="text-sm font-bold text-slate-900">프리셋</h3>
      {list.status === "loading" && (
        <LoadingSpinner label="프리셋을 불러오는 중입니다." className="mt-2" />
      )}
      {list.status === "error" && (
        <p role="alert" className="mt-2 text-sm font-bold text-red-700">
          프리셋을 불러오지 못했습니다. 잠시 뒤 다시 시도해 주세요.
        </p>
      )}
      {unavailable && (
        <p className="mt-2 text-sm text-slate-600">
          프리셋 저장소를 쓸 수 없습니다. 저장하거나 불러올 수 없습니다.
        </p>
      )}
      {list.status === "done" && list.presets.length === 0 && (
        <p className="mt-2 text-sm text-slate-500">저장된 프리셋이 없습니다.</p>
      )}
      {list.status === "done" && list.presets.length > 0 && (
        <ul aria-label="프리셋 목록" className="mt-2 grid gap-2">
          {list.presets.map((preset) => (
            <li
              key={preset.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white p-3"
            >
              <span className="min-w-0 break-words text-sm font-bold text-slate-900">
                {preset.label}
              </span>
              <span className="flex gap-2">
                <button
                  type="button"
                  className={rowButtonClass}
                  onClick={() => load(preset)}
                >
                  불러오기
                </button>
                {confirming === preset.id ? (
                  <>
                    <button
                      type="button"
                      disabled={busy}
                      className="min-h-11 rounded-xl border border-red-200 px-4 text-sm font-bold text-red-800 disabled:cursor-not-allowed disabled:opacity-60"
                      onClick={() => remove(preset.id)}
                    >
                      삭제 확인
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      className={rowButtonClass}
                      onClick={() => setConfirming(null)}
                    >
                      취소
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className={rowButtonClass}
                    onClick={() => setConfirming(preset.id)}
                  >
                    삭제
                  </button>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <label className="min-w-0 flex-1 text-sm font-bold text-slate-900">
          프리셋 이름
          <input
            value={label}
            maxLength={60}
            onChange={(event) => setLabel(event.target.value)}
            className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 outline-none focus-visible:border-blue-500 focus-visible:ring-4 focus-visible:ring-blue-500/10"
          />
        </label>
        <button
          type="button"
          onClick={save}
          disabled={busy || unavailable}
          className="min-h-11 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          프리셋 저장
        </button>
      </div>
      {message?.kind === "error" && (
        <p role="alert" className="mt-2 text-sm font-bold text-red-700">
          {message.text}
        </p>
      )}
      {message?.kind === "notice" && (
        <p role="status" className="mt-2 text-sm text-slate-600">
          {message.text}
        </p>
      )}
    </section>
  );
};
