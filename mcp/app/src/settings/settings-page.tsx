import { useCallback, useEffect, useRef, useState } from "react";

import {
  activateSetting,
  createSetting,
  deleteSetting,
  listSettings,
  updateSetting,
} from "../api/settings-api";
import type { ModelSetting, ModelSettingInput } from "../types";

import { EnvironmentSection } from "./environment-section";
import { SettingForm } from "./setting-form";

type Message = { text: string; isError: boolean };

const errorText = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

export const SettingsPage = () => {
  const [settings, setSettings] = useState<ModelSetting[]>([]);
  const [message, setMessage] = useState<Message | null>(null);
  const [editing, setEditing] = useState<ModelSetting | null>(null);
  const mounted = useRef(true);

  const reload = useCallback(async () => {
    const loaded = await listSettings();
    if (mounted.current) setSettings(loaded);
  }, []);

  const reloadWithMessage = useCallback(() => {
    reload().catch((error: unknown) => {
      if (!mounted.current) return;
      setMessage({
        text: errorText(error, "설정을 불러오지 못했습니다."),
        isError: true,
      });
    });
  }, [reload]);

  useEffect(() => {
    mounted.current = true;
    reloadWithMessage();
    return () => {
      mounted.current = false;
    };
  }, [reloadWithMessage]);

  const handleActivate = async (setting: ModelSetting) => {
    try {
      await activateSetting(setting.id);
      await reload();
      setMessage({ text: "모델 설정을 활성화했습니다.", isError: false });
    } catch (error) {
      setMessage({
        text: errorText(error, "요청을 처리하지 못했습니다."),
        isError: true,
      });
    }
  };

  const handleDelete = async (setting: ModelSetting) => {
    if (!window.confirm("이 비활성 설정을 삭제할까요?")) return;
    try {
      await deleteSetting(setting.id);
      await reload();
      setMessage({ text: "모델 설정을 삭제했습니다.", isError: false });
    } catch (error) {
      setMessage({
        text: errorText(error, "요청을 처리하지 못했습니다."),
        isError: true,
      });
    }
  };

  const handleSubmit = async (input: ModelSettingInput): Promise<boolean> => {
    try {
      if (editing) await updateSetting(editing.id, input);
      else await createSetting(input);
      await reload();
      setMessage({
        text: editing
          ? "모델 설정을 수정했습니다."
          : "모델 설정을 추가했습니다.",
        isError: false,
      });
      setEditing(null);
      return true;
    } catch (error) {
      setMessage({
        text: errorText(error, "설정을 저장하지 못했습니다."),
        isError: true,
      });
      return false;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <header className="mx-auto flex h-[72px] w-[calc(100%-32px)] max-w-5xl items-center justify-between border-b border-slate-200">
        <div className="flex items-center gap-3 text-sm font-bold tracking-tight">
          <span className="grid size-[34px] place-items-center rounded-xl bg-blue-600 text-white">
            P
          </span>
          <span>PORTFOLIO MCP</span>
        </div>
        <form action="/admin/ai-models/logout" method="post">
          <button
            type="submit"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600"
          >
            로그아웃
          </button>
        </form>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-0 sm:py-14">
        <p className="text-xs font-extrabold uppercase tracking-[.14em] text-blue-700">
          MCP 관리자
        </p>
        <h1 className="mb-3 mt-2 text-4xl font-bold tracking-tight">
          AI 모델 설정
        </h1>
        <p className="leading-relaxed text-slate-600">
          개발 및 운영 MCP에서 사용할 OpenRouter 모델을 관리합니다. API 키는
          저장하지 않고 Secret Manager 참조만 등록합니다.
        </p>
        <button
          type="button"
          onClick={reloadWithMessage}
          className="mt-4 min-h-11 rounded-xl border border-slate-200 px-5 text-sm font-bold text-slate-700"
        >
          새로고침
        </button>
        {message && (
          <p
            role="status"
            aria-live="polite"
            className={
              message.isError
                ? "mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
                : "mt-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
            }
          >
            {message.text}
          </p>
        )}
        <div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <EnvironmentSection
            id="environment-development"
            title="개발 환경"
            settings={settings.filter((s) => s.environment === "development")}
            onActivate={handleActivate}
            onEdit={setEditing}
            onDelete={handleDelete}
          />
          <EnvironmentSection
            id="environment-production"
            title="운영 환경"
            settings={settings.filter((s) => s.environment === "production")}
            onActivate={handleActivate}
            onEdit={setEditing}
            onDelete={handleDelete}
          />
        </div>
        <SettingForm
          key={editing?.id ?? "new"}
          editing={editing}
          onCancel={() => setEditing(null)}
          onSubmit={handleSubmit}
        />
      </main>
    </div>
  );
};
