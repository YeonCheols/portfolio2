import type { ArchiveKey, ArchiveQuery, ModelEnvironment } from "../../types";

export const debugPagePath = "/admin/debug/resume";

// 서버 reader가 허용하는 "무엇 직후 실패했는지" 단계와 같은 목록이다
export const failedStageOptions = [
  { value: "started", label: "started" },
  { value: "source", label: "source" },
  { value: "model_request", label: "model_request" },
  { value: "model_response", label: "model_response" },
  { value: "validation", label: "validation" },
  { value: "pdf", label: "pdf" },
] as const;

const isEnvironment = (value: string | null): value is ModelEnvironment =>
  value === "development" || value === "production";

// URL이 화면 상태의 원본이므로 알 수 없는 값은 기본값으로 바로잡는다
export const parseListSearch = (
  search: string,
): ArchiveQuery & { page: number } => {
  const params = new URLSearchParams(search);
  const environment = params.get("environment");
  const page = Number(params.get("page"));
  const failedStage = params.get("failedStage");
  return {
    environment: isEnvironment(environment) ? environment : "development",
    generationId: params.get("generationId") || undefined,
    attemptId: params.get("attemptId") || undefined,
    failedStage: failedStageOptions.some(
      (option) => option.value === failedStage,
    )
      ? (failedStage as string)
      : undefined,
    page: Number.isInteger(page) && page >= 1 ? page : 1,
  };
};

export const parseDetailKey = (search: string): ArchiveKey | null => {
  const params = new URLSearchParams(search);
  const environment = params.get("environment");
  const subjectHash = params.get("subjectHash");
  const generationId = params.get("generationId");
  const attemptId = params.get("attemptId");
  if (
    !isEnvironment(environment) ||
    !subjectHash ||
    !generationId ||
    !attemptId
  )
    return null;
  return { environment, subjectHash, generationId, attemptId };
};

export const listHref = (query: ArchiveQuery, page: number): string => {
  const params = new URLSearchParams({ environment: query.environment });
  for (const name of ["generationId", "attemptId", "failedStage"] as const) {
    const value = query[name];
    if (value) params.set(name, value);
  }
  params.set("page", String(page));
  return `${debugPagePath}?${params}`;
};

export const detailHref = (key: ArchiveKey): string =>
  `${debugPagePath}?${new URLSearchParams({ ...key })}`;
