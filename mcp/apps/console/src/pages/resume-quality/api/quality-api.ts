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

export const maxDashboardPages = 20;
export const dashboardPageSize = 100;

// 목록 전체의 합산 통계를 만들려고 마지막 페이지까지 읽는다. 상한에 닿으면 읽은 만큼만 돌려주고 잘렸음을 알린다.
// 중간 페이지가 실패하면 일부 합계를 전체처럼 보이지 않도록 오류를 그대로 던진다
export const listAllResumeQualityDashboard = async (query: {
  environment: ModelEnvironment;
}): Promise<{ items: ResumeQualityDashboardItem[]; truncated: boolean }> => {
  const items: ResumeQualityDashboardItem[] = [];
  for (let page = 1; page <= maxDashboardPages; page += 1) {
    const result = await listResumeQualityDashboard({
      environment: query.environment,
      page,
      pageSize: dashboardPageSize,
    });
    items.push(...result.items);
    if (!result.hasMore) return { items, truncated: false };
  }
  return { items, truncated: true };
};
