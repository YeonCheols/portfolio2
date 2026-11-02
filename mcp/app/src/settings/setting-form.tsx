import { useState, type ChangeEvent, type FormEvent } from "react";

import type {
  ModelEnvironment,
  ModelSetting,
  ModelSettingInput,
} from "../types";

type SettingFormProps = {
  editing: ModelSetting | null;
  onCancel: () => void;
  onSubmit: (input: ModelSettingInput) => Promise<boolean>;
};

const defaultUrl = "https://openrouter.ai/api/v1/chat/completions";

const initialValues: ModelSettingInput = {
  environment: "development",
  provider: "openrouter",
  modelName: "",
  url: defaultUrl,
  secretRef: "",
};

const fieldClass =
  "mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-3";

const valuesOf = (setting: ModelSetting | null): ModelSettingInput =>
  setting
    ? {
        environment: setting.environment,
        provider: setting.provider,
        modelName: setting.modelName,
        url: setting.url,
        secretRef: setting.secretRef,
      }
    : initialValues;

export const SettingForm = ({
  editing,
  onCancel,
  onSubmit,
}: SettingFormProps) => {
  const [values, setValues] = useState<ModelSettingInput>(valuesOf(editing));
  const [saving, setSaving] = useState(false);

  const change =
    (field: keyof ModelSettingInput) =>
    (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setValues((current) => ({ ...current, [field]: event.target.value }));
    };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    const saved = await onSubmit({
      ...values,
      modelName: values.modelName.trim(),
      url: values.url.trim(),
      secretRef: values.secretRef.trim(),
    });
    setSaving(false);
    if (saved) setValues(initialValues);
  };

  return (
    <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
      <h2 className="text-lg font-bold">
        {editing ? "모델 설정 수정" : "모델 설정 추가"}
      </h2>
      <p className="mb-5 mt-1 text-sm text-slate-600">
        활성 설정은 수정할 수 없습니다. 새 설정을 만든 뒤 활성화해 주세요.
      </p>
      <form onSubmit={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="text-sm font-semibold">
          <label htmlFor="setting-environment">환경</label>
          <select
            id="setting-environment"
            className={fieldClass}
            value={values.environment}
            onChange={change("environment")}
            disabled={editing !== null}
            required
          >
            <option value={"development" satisfies ModelEnvironment}>
              개발
            </option>
            <option value={"production" satisfies ModelEnvironment}>
              운영
            </option>
          </select>
        </div>
        <div className="text-sm font-semibold">
          <label htmlFor="setting-provider">공급자</label>
          <select
            id="setting-provider"
            className={fieldClass}
            value={values.provider}
            onChange={change("provider")}
            required
          >
            <option value="openrouter">OpenRouter</option>
          </select>
        </div>
        <div className="text-sm font-semibold">
          <label htmlFor="setting-model-name">모델 이름</label>
          <input
            id="setting-model-name"
            className={fieldClass}
            placeholder="anthropic/claude-sonnet-5.5"
            maxLength={200}
            value={values.modelName}
            onChange={change("modelName")}
            required
          />
        </div>
        <div className="text-sm font-semibold">
          <label htmlFor="setting-url">API 주소</label>
          <input
            id="setting-url"
            type="url"
            className={fieldClass}
            value={values.url}
            onChange={change("url")}
            required
          />
        </div>
        <div className="text-sm font-semibold sm:col-span-2">
          <label htmlFor="setting-secret-ref">Secret Manager 참조 이름</label>
          <input
            id="setting-secret-ref"
            className={fieldClass}
            placeholder="RESUME_MODEL_TOKEN_OPENROUTER"
            pattern="RESUME_MODEL_TOKEN[A-Za-z0-9_\-]{0,237}"
            maxLength={255}
            value={values.secretRef}
            onChange={change("secretRef")}
            required
          />
          <span className="mt-1 block font-normal text-slate-500">
            토큰 원문이나 API 키는 입력하지 마세요.
          </span>
        </div>
        <div className="flex flex-wrap gap-3 sm:col-span-2">
          <button
            type="submit"
            disabled={saving}
            className="min-h-11 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white disabled:opacity-60"
          >
            {editing ? "변경 저장" : "설정 저장"}
          </button>
          {editing && (
            <button
              type="button"
              onClick={onCancel}
              className="min-h-11 rounded-xl border border-slate-200 px-5 text-sm font-bold text-slate-700"
            >
              수정 취소
            </button>
          )}
        </div>
      </form>
    </section>
  );
};
