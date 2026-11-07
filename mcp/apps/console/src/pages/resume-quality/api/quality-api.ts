import type {
  ModelEnvironment,
  ResumeQualityDashboardItem,
} from "../../../types";
import { request } from "../../../shared/api/request";

export type ResumeQualitySummary = {
  items: ResumeQualityDashboardItem[];
  truncated: boolean;
  archivesScanned: number;
};

// 목록 전체의 합산 통계에 쓸 평가 기록을 서버에서 한 번에 읽는다.
// 서버가 읽는 실행 수에 상한이 있어 잘렸으면 truncated로 알린다
export const listAllResumeQualityDashboard = async (query: {
  environment: ModelEnvironment;
}): Promise<ResumeQualitySummary> => {
  const params = new URLSearchParams({ environment: query.environment });
  const body: unknown = await request(
    `/admin/resume-quality/api/dashboard/all?${params}`,
    { method: "GET", credentials: "same-origin" },
  );
  if (
    typeof body !== "object" ||
    body === null ||
    !("ok" in body) ||
    body.ok !== true ||
    !("items" in body) ||
    !Array.isArray(body.items) ||
    !("truncated" in body) ||
    typeof body.truncated !== "boolean" ||
    !("archivesScanned" in body) ||
    typeof body.archivesScanned !== "number"
  )
    throw new Error("품질 대시보드 응답 형식이 올바르지 않습니다.");
  return {
    items: body.items as ResumeQualityDashboardItem[],
    truncated: body.truncated,
    archivesScanned: body.archivesScanned,
  };
};
