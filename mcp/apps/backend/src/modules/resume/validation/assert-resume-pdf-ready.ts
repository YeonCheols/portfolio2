import { ResumeConnectionError } from "@mcp/infrastructure/connection/connection";
import type { GeneratedResume } from "@mcp/modules/resume/generation/run-resume-harness";

// PDF로 내보낼 수 있는 생성 결과인지 검사한다. convert_resume_to_pdf와 관리자 재현이 같은 규칙을 쓴다
export const assertResumePdfReady = (
  generated: Pick<GeneratedResume, "resume" | "gaps" | "conflicts">,
): void => {
  if (!generated.resume.trim()) {
    throw new ResumeConnectionError("INCOMPLETE_RESUME");
  }
  if (generated.gaps.length || generated.conflicts.length) {
    throw new ResumeConnectionError("UNVERIFIED_CLAIMS");
  }
};
