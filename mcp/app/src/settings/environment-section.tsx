import type { ConnectionTestState, ModelSetting } from "../types";

import { SettingCard } from "./setting-card";

type EnvironmentSectionProps = {
  id: string;
  title: string;
  settings: ModelSetting[];
  loading: boolean;
  testStates: Record<number, ConnectionTestState>;
  onTest: (setting: ModelSetting) => void;
  onActivate: (setting: ModelSetting) => void;
  onEdit: (setting: ModelSetting) => void;
  onDelete: (setting: ModelSetting) => void;
};

export const EnvironmentSection = ({
  id,
  title,
  settings,
  loading,
  testStates,
  onTest,
  onActivate,
  onEdit,
  onDelete,
}: EnvironmentSectionProps) => (
  <section
    aria-labelledby={id}
    className="rounded-2xl border border-slate-200 bg-white p-6"
  >
    <h2 id={id} className="mb-3 text-base font-bold">
      {title}
    </h2>
    <div className="space-y-3">
      {loading ? (
        <p className="text-sm text-slate-500">설정을 불러오는 중입니다.</p>
      ) : settings.length === 0 ? (
        <p className="text-sm text-slate-500">등록된 설정이 없습니다.</p>
      ) : (
        settings.map((setting) => (
          <SettingCard
            key={setting.id}
            setting={setting}
            testState={testStates[setting.id]}
            onTest={onTest}
            onActivate={onActivate}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))
      )}
    </div>
  </section>
);
