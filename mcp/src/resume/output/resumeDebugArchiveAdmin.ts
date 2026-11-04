import { createResumeArchiveReproducer } from "@mcp/resume/output/reproduceResumeArchive";
import { createResumeDebugArchiveReader } from "@mcp/resume/output/resumeDebugArchiveReader";
import {
  createResumeDebugArchiveWriter,
  type ArchiveWriteStorage,
} from "@mcp/resume/output/resumeDebugArchiveWriter";

// 관리자 화면이 쓰는 아카이브 작업 전체: 조회, 수정본·삭제, 모델 없이 하는 재현
export const createResumeDebugArchiveAdmin = (
  storage: ArchiveWriteStorage,
) => ({
  ...createResumeDebugArchiveReader(storage),
  ...createResumeDebugArchiveWriter(storage),
  ...createResumeArchiveReproducer(storage),
});

export type ResumeDebugArchiveAdmin = ReturnType<
  typeof createResumeDebugArchiveAdmin
>;
