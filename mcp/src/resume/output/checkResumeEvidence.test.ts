import type { ResumeSelectionNode } from "@mcp/resume/output/checkResumeDraft";
import { checkResumeEvidence } from "@mcp/resume/output/checkResumeEvidence";

const source: ResumeSelectionNode = {
  id: "profile",
  section: "profile",
  name: "name",
  text: "테스트 사용자",
  sourceRefs: [],
  visibility: "public",
  children: [],
};

describe("checkResumeEvidence", () => {
  it("출처별 원문 근거가 일치하는 문장만 남기고 누락·다른 출처·없는 구절을 거부한다", () => {
    const text = "테스트 사용자입니다";
    const valid = {
      text,
      sourceIds: ["profile"],
      evidence: [{ sourceId: "profile", quote: "테스트 사용자" }],
    };
    expect(checkResumeEvidence([source], [valid]).claims).toHaveLength(1);
    for (const evidence of [
      undefined,
      [],
      [{ sourceId: "other", quote: "테스트 사용자" }],
      [{ sourceId: "profile", quote: "없는 근거" }],
    ]) {
      const result = checkResumeEvidence([source], [{ ...valid, evidence }]);
      expect(result.claims).toHaveLength(0);
      expect(result.validationIssues[0]?.code).toBe("INVALID_SOURCE_EVIDENCE");
    }
  });
});
