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
  it("원문 표기를 유지한 기간·인원·버전은 통과하고 변경한 단위와 수치는 거부한다", () => {
    const quote = "2024-01 ~ 2024-06, FE 6명, React 18, 조회율 30%";
    const record = { ...source, text: quote };
    for (const text of [
      "FE 6명과 React 18로 구현했습니다",
      "2024-01 ~ 2024-06에 조회율 30%를 기록했습니다",
    ]) {
      expect(
        checkResumeEvidence(
          [record],
          [
            {
              text,
              sourceIds: ["profile"],
              evidence: [{ sourceId: "profile", quote }],
            },
          ],
        ).claims,
      ).toHaveLength(1);
    }
    for (const text of [
      "FE 6만명",
      "React 19",
      "조회율 30만",
      "2025-01에 진행했습니다",
    ]) {
      expect(
        checkResumeEvidence(
          [record],
          [
            {
              text,
              sourceIds: ["profile"],
              evidence: [{ sourceId: "profile", quote }],
            },
          ],
        ).validationIssues,
      ).toContainEqual({
        code: "UNSUPPORTED_NUMERIC_FACT",
        sourceIds: ["profile"],
      });
    }
  });
  it("인용이 일치해도 원문에 없는 성과 수치를 생성하면 거부한다", () => {
    const outcome = { ...source, text: "조회율이 30% 증가했습니다" };
    const result = checkResumeEvidence(
      [outcome],
      [
        {
          text: "조회율이 50% 증가했습니다",
          sourceIds: ["profile"],
          evidence: [{ sourceId: "profile", quote: outcome.text }],
        },
      ],
    );
    expect(result.claims).toEqual([]);
    expect(result.validationIssues).toContainEqual({
      code: "UNSUPPORTED_NUMERIC_FACT",
      sourceIds: ["profile"],
    });
    expect(result.gaps).toHaveLength(1);
  });
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
