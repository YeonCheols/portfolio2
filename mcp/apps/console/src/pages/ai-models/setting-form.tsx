import { useState, type ChangeEvent, type FormEvent } from "react";

import type {
  ModelEnvironment,
  ModelSetting,
  ModelSettingInput,
} from "../../types";

import { SelectField } from "../../shared/ui/select-field";

import { MODEL_PROVIDERS } from "./providers/model-providers";

type SettingFormProps = {
  editing: ModelSetting | null;
  onCancel: () => void;
  onSubmit: (input: ModelSettingInput) => Promise<boolean>;
};

const initialValues: ModelSettingInput = {
  environment: "development",
  provider: "openrouter",
  modelName: "",
  url: MODEL_PROVIDERS[0].url,
  apiKey: "",
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
        apiKey: "",
      }
    : initialValues;

export const SettingForm = ({
  editing,
  onCancel,
  onSubmit,
}: SettingFormProps) => {
  const [values, setValues] = useState<ModelSettingInput>(valuesOf(editing));
  const [saving, setSaving] = useState(false);

  const selectedProvider = MODEL_PROVIDERS.find(
    (provider) => provider.value === values.provider,
  );

  const change =
    (field: keyof ModelSettingInput) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setValues((current) => ({ ...current, [field]: value }));
    };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    const { apiKey, ...metadata } = values;
    const saved = await onSubmit({
      ...metadata,
      modelName: values.modelName.trim(),
      url: values.url.trim(),
      ...(apiKey?.trim() ? { apiKey: apiKey.trim() } : {}),
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
        <SelectField<ModelEnvironment>
          id="setting-environment"
          label="환경"
          value={values.environment}
          options={[
            { value: "development", label: "개발" },
            { value: "production", label: "운영" },
          ]}
          disabled={editing !== null}
          onChange={(environment) =>
            setValues((current) => ({ ...current, environment }))
          }
        />
        <SelectField
          id="setting-provider"
          label="공급자"
          value={values.provider}
          options={MODEL_PROVIDERS}
          onChange={(provider) => {
            const selected = MODEL_PROVIDERS.find(
              (item) => item.value === provider,
            );
            if (!selected) return;
            setValues((current) => ({
              ...current,
              provider,
              url: selected.url,
            }));
          }}
        />
        <div className="text-sm font-semibold">
          <label htmlFor="setting-model-name">모델 이름</label>
          <input
            id="setting-model-name"
            className={fieldClass}
            placeholder={
              selectedProvider
                ? `예: ${selectedProvider.modelExample}`
                : "모델 ID를 입력하세요"
            }
            aria-describedby={
              selectedProvider ? "setting-model-help" : undefined
            }
            maxLength={200}
            value={values.modelName}
            onChange={change("modelName")}
            required
          />
          {selectedProvider && (
            <div
              id="setting-model-help"
              className="mt-2 space-y-1.5 font-normal text-slate-500"
            >
              <p>
                예:{" "}
                <code className="text-xs text-slate-600">
                  {selectedProvider.modelExample}
                </code>
              </p>
              <a
                href={selectedProvider.modelsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-blue-600 underline-offset-4 hover:underline focus-visible:rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
              >
                {selectedProvider.label} 모델 목록
                <span className="sr-only"> (새 창)</span>
                <span aria-hidden="true">↗</span>
              </a>
            </div>
          )}
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
          <label htmlFor="setting-api-key">모델 API 키</label>
          <input
            id="setting-api-key"
            className={fieldClass}
            type="password"
            autoComplete="new-password"
            placeholder={
              editing?.hasApiKey
                ? "비워두면 기존 키를 유지합니다"
                : "모델 공급자가 발급한 API 키"
            }
            maxLength={4096}
            value={values.apiKey ?? ""}
            onChange={change("apiKey")}
            required={!editing?.hasApiKey}
          />
          <span className="mt-1 block font-normal text-slate-500">
            키는 portfolio-api에 저장되며 목록에서는 등록 여부만 표시합니다.
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
