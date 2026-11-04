import type {
  ArchiveDetail,
  ArchiveKey,
  ArchiveQuery,
  ArchiveSummary,
} from "../types";

import { ApiError, request } from "./request";

const archivesUrl = "/admin/debug/resume/api/archives";
const invalidShape = (what: string) =>
  new Error(`${what} 형식이 올바르지 않습니다.`);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

// 없는 실행만 따로 안내하고 서버가 보낸 내용은 쓰지 않는다
const get = async (url: string): Promise<Record<string, unknown>> => {
  try {
    const body = await request(url, { method: "GET" });
    if (!isRecord(body) || body.ok !== true) throw invalidShape("응답");
    return body;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      throw new Error("보관된 실행을 찾을 수 없습니다.");
    }
    throw error;
  }
};

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
