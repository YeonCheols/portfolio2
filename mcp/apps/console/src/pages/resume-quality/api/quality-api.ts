import type {
  ModelEnvironment,
  ResumeQualityDashboardItem,
} from "../../../types";
import { request } from "../../../shared/api/request";

export const listResumeQualityDashboard = async (query: {
  environment: ModelEnvironment;
  page?: number;
  pageSize?: number;
}): Promise<{ items: ResumeQualityDashboardItem[]; hasMore: boolean }> => {
  const params = new URLSearchParams({ environment: query.environment });
  if (query.page !== undefined) params.set("page", String(query.page));
  if (query.pageSize !== undefined)
    params.set("pageSize", String(query.pageSize));
  const body: unknown = await request(
    `/admin/resume-quality/api/dashboard?${params}`,
    { method: "GET", credentials: "same-origin" },
  );
  if (
    typeof body !== "object" ||
    body === null ||
    !("ok" in body) ||
    body.ok !== true ||
    !("items" in body) ||
    !Array.isArray(body.items) ||
    !("hasMore" in body) ||
    typeof body.hasMore !== "boolean"
  )
    throw new Error("품질 대시보드 응답 형식이 올바르지 않습니다.");
  return {
    items: body.items as ResumeQualityDashboardItem[],
    hasMore: body.hasMore,
  };
};
