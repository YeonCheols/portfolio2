import type { ModelSetting } from "../types";

type SettingCardProps = {
  setting: ModelSetting;
  onActivate: (setting: ModelSetting) => void;
  onEdit: (setting: ModelSetting) => void;
  onDelete: (setting: ModelSetting) => void;
};

export const SettingCard = ({
  setting,
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
      <div>시크릿 참조: {setting.secretRef}</div>
    </dl>
    <div className="mt-4 flex flex-wrap gap-2">
      {setting.isActive ? (
        <span className="text-xs font-semibold text-green-800">
          현재 환경에서 사용 중인 설정입니다.
        </span>
      ) : (
        <>
          <button
            type="button"
            onClick={() => onActivate(setting)}
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
  </article>
);
