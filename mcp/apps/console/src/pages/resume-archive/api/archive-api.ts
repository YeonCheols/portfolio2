import type {
  ArchiveDetail,
  ArchiveKey,
  ArchiveQuery,
  ArchiveSummary,
  ReproductionAction,
  ReproductionRecord,
  ReproductionSource,
  RevisionRecord,
  RevisionSummary,
  ResumeQualityReview,
} from "../../../types";

import { ApiError, request } from "../../../shared/api/request";

const archivesUrl = "/admin/debug/resume/api/archives";
const invalidShape = (what: string) =>
  new Error(`${what} 형식이 올바르지 않습니다.`);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const actionMessages: Record<string, string> = {
  INVALID_RESPONSE:
    "응답이 올바른 JSON 형식이 아니거나 지원하지 않는 구조입니다.",
  RESPONSE_TOO_LARGE: "응답이 너무 큽니다. 100만 자 이하로 줄여 주세요.",
  UNKNOWN_SOURCE_REF: "스냅샷에 없는 출처 ID를 참조하고 있습니다.",
  INVALID_REQUEST_PAYLOAD:
    "요청 페이로드에는 persona와 prompt 문자열이 필요합니다.",
  INVALID_BASE_FILE: "기준 단계 파일을 찾을 수 없습니다.",
  SNAPSHOT_MISSING: "이 실행에는 보관된 스냅샷이 없어 처리할 수 없습니다.",
  REPRODUCTION_IN_PROGRESS: "이미 같은 재현이 실행 중입니다.",
  CONFIRMATION_MISMATCH: "입력한 실행 ID가 삭제 대상과 다릅니다.",
  INVALID_REQUEST: "입력 값이 올바르지 않습니다.",
  BODY_TOO_LARGE: "요청이 너무 큽니다.",
  ARCHIVE_NOT_FOUND: "보관된 실행을 찾을 수 없습니다.",
  QUALITY_CASE_NOT_REVIEWABLE:
    "이미 판정했거나 현재 평가에서 찾을 수 없습니다.",
  QUALITY_REVIEW_NOT_FOUND: "품질 평가 결과를 찾을 수 없습니다.",
  QUALITY_REVIEW_UNAVAILABLE: "품질 판정 저장소를 사용할 수 없습니다.",
  QUALITY_REVIEW_STORAGE_FAILED: "품질 판정을 저장하지 못했습니다.",
};

// 서버가 정한 코드만 안내 문구로 바꾸고 그 밖의 내용은 일반 문구로 둔다
const translate = (error: unknown): unknown => {
  if (!(error instanceof ApiError)) return error;
  if (error.code === "DELETE_PARTIAL") {
    return new Error(
      `일부만 삭제되었습니다. 삭제 ${error.details.removed ?? 0}개, 남음 ${error.details.remaining ?? 0}개입니다.`,
    );
  }
  if (error.code && actionMessages[error.code]) {
    return new Error(actionMessages[error.code]);
  }
  if (error.status === 404) return new Error(actionMessages.ARCHIVE_NOT_FOUND);
  return error;
};

const call = async (
  url: string,
  init: RequestInit,
): Promise<Record<string, unknown>> => {
  try {
    const body = await request(url, init);
    if (!isRecord(body) || body.ok !== true) throw invalidShape("응답");
    return body;
  } catch (error) {
    throw translate(error);
  }
};

const get = (url: string) => call(url, { method: "GET" });

const post = (url: string, payload: unknown) =>
  call(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });

const keyParams = (key: ArchiveKey): URLSearchParams =>
  new URLSearchParams({
    environment: key.environment,
    subjectHash: key.subjectHash,
    generationId: key.generationId,
    attemptId: key.attemptId,
  });

export const listArchives = async (
  query: ArchiveQuery,
): Promise<{ items: ArchiveSummary[]; hasMore: boolean }> => {
  const params = new URLSearchParams({ environment: query.environment });
  for (const name of ["generationId", "attemptId", "failedStage"] as const) {
    const value = query[name];
    if (value) params.set(name, value);
  }
  if (query.page !== undefined) params.set("page", String(query.page));
  if (query.pageSize !== undefined)
    params.set("pageSize", String(query.pageSize));
  const body = await get(`${archivesUrl}?${params}`);
  if (!Array.isArray(body.items) || typeof body.hasMore !== "boolean") {
    throw invalidShape("실행 목록");
  }
  return { items: body.items as ArchiveSummary[], hasMore: body.hasMore };
};

export const getArchiveDetail = async (
  key: ArchiveKey,
): Promise<ArchiveDetail> => {
  const body = await get(`${archivesUrl}/detail?${keyParams(key)}`);
  if (!isRecord(body.summary) || !Array.isArray(body.files)) {
    throw invalidShape("실행 상세");
  }
  return {
    summary: body.summary as ArchiveDetail["summary"],
    files: body.files as ArchiveDetail["files"],
    latest: body.latest,
  };
};

export const getArchiveFileUrl = async (
  key: ArchiveKey,
  file: string,
): Promise<string> => {
  const params = keyParams(key);
  params.set("file", file);
  const body = await get(`${archivesUrl}/file-url?${params}`);
  // 새 탭으로 여는 주소라 https 외의 스킴은 받지 않는다
  if (typeof body.url !== "string" || !body.url.startsWith("https://")) {
    throw invalidShape("파일 주소");
  }
  return body.url;
};

export const listRevisions = async (
  key: ArchiveKey,
): Promise<RevisionSummary[]> => {
  const body = await get(`${archivesUrl}/revisions?${keyParams(key)}`);
  if (!Array.isArray(body.items)) throw invalidShape("수정본 목록");
  return body.items as RevisionSummary[];
};

export const getRevision = async (
  key: ArchiveKey,
  revisionId: string,
): Promise<RevisionRecord> => {
  const params = keyParams(key);
  params.set("revisionId", revisionId);
  const body = await get(`${archivesUrl}/revision?${params}`);
  if (!isRecord(body.revision) || typeof body.revision.response !== "string") {
    throw invalidShape("수정본");
  }
  return body.revision as RevisionRecord;
};

export const saveRevision = async (
  key: ArchiveKey,
  input: { baseFile: string; request?: unknown; response: string },
): Promise<string> => {
  const body = await post(`${archivesUrl}/revisions`, { ...key, ...input });
  if (typeof body.revisionId !== "string")
    throw invalidShape("수정본 저장 결과");
  return body.revisionId;
};

export const listReproductions = async (
  key: ArchiveKey,
): Promise<ReproductionRecord[]> => {
  const body = await get(`${archivesUrl}/reproductions?${keyParams(key)}`);
  if (!Array.isArray(body.items)) throw invalidShape("재현 기록");
  return body.items as ReproductionRecord[];
};

export const listQualityReviews = async (
  key: ArchiveKey,
  evaluationId: string,
): Promise<ResumeQualityReview[]> => {
  const params = keyParams(key);
  params.set("evaluationId", evaluationId);
  const body = await get(`${archivesUrl}/quality-reviews?${params}`);
  if (!Array.isArray(body.items)) throw invalidShape("품질 판정 목록");
  return body.items as ResumeQualityReview[];
};

export const saveQualityReview = async (
  key: ArchiveKey,
  input: {
    evaluationId: string;
    caseId: string;
    decision: "pass" | "fail";
  },
): Promise<ResumeQualityReview> => {
  const body = await post(`${archivesUrl}/quality-reviews`, {
    ...key,
    ...input,
  });
  if (!isRecord(body.review) || typeof body.review.caseId !== "string")
    throw invalidShape("품질 판정 저장 결과");
  return body.review as ResumeQualityReview;
};

export const reproduceArchive = async (
  key: ArchiveKey,
  input: { source: ReproductionSource; action: ReproductionAction },
): Promise<{
  record: ReproductionRecord;
  pdfBase64?: string;
  pdfOmitted?: true;
}> => {
  const body = await post(`${archivesUrl}/reproductions`, { ...key, ...input });
  if (!isRecord(body.record)) throw invalidShape("재현 결과");
  return {
    record: body.record as ReproductionRecord,
    ...(typeof body.pdfBase64 === "string"
      ? { pdfBase64: body.pdfBase64 }
      : {}),
    ...(body.pdfOmitted === true ? { pdfOmitted: true as const } : {}),
  };
};

export const removeArchive = async (
  key: ArchiveKey,
  confirm: string,
): Promise<number> => {
  const body = await post(`${archivesUrl}/delete`, { ...key, confirm });
  if (typeof body.removed !== "number") throw invalidShape("삭제 결과");
  return body.removed;
};
