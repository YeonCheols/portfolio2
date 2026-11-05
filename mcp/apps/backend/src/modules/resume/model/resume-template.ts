export const resumeTemplateNames = [
  "기본형",
  "경력 중심형",
  "프로젝트 중심형",
] as const;

export type ResumeTemplate = (typeof resumeTemplateNames)[number];

export const isResumeTemplate = (value: unknown): value is ResumeTemplate =>
  resumeTemplateNames.some((name) => name === value);
