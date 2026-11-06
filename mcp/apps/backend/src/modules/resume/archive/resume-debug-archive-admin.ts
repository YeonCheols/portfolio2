import { createResumeArchiveReproducer } from "@mcp/modules/resume/archive/reproduce-resume-archive";
import { createResumeDebugArchiveReader } from "@mcp/modules/resume/archive/resume-debug-archive-reader";
import {
  createResumeDebugArchiveWriter,
  type ArchiveWriteStorage,
} from "@mcp/modules/resume/archive/resume-debug-archive-writer";
import type { createResumeQualityReviewStore } from "@mcp/modules/resume/quality/resume-quality-review-store";
import { createResumeQualityDashboardReader } from "@mcp/modules/resume/archive/resume-quality-dashboard-reader";

type QualityReviewAdmin = Pick<
  ReturnType<typeof createResumeQualityReviewStore>,
  "list" | "save"
>;

// 관리자 화면이 쓰는 아카이브 작업 전체: 조회, 수정본·삭제, 모델 없이 하는 재현
export const createResumeDebugArchiveAdmin = (
  storage: ArchiveWriteStorage,
  qualityReviews?: QualityReviewAdmin,
) => ({
  ...createResumeDebugArchiveReader(storage),
  ...createResumeDebugArchiveWriter(storage),
  ...createResumeArchiveReproducer(storage),
  listQualityDashboard: createResumeQualityDashboardReader(storage).list,
  ...(qualityReviews
    ? {
        listQualityReviews: qualityReviews.list,
        saveQualityReview: qualityReviews.save,
      }
    : {}),
});

export type ResumeDebugArchiveAdmin = ReturnType<
  typeof createResumeDebugArchiveAdmin
>;
