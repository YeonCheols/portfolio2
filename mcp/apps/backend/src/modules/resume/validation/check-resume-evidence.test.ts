import type { ResumeSelectionNode } from "@mcp/modules/resume/validation/check-resume-draft";
import { checkResumeEvidence } from "@mcp/modules/resume/validation/check-resume-evidence";

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
  it("인원 단위가 확인된 수치를 직접 인용하면 만명 표현을 인정하고 단위 추정과 수치 변경은 거부한다", () => {
    const count = { ...source, name: "before", text: "700000", unit: "person" };
    const check = (record: ResumeSelectionNode, text: string) =>
      checkResumeEvidence(
        [record],
        [
          {
            text,
            sourceIds: ["profile"],
            evidence: [{ sourceId: "profile", quote: record.text }],
          },
        ],
      );
    expect(check(count, "회원 70만명").validationIssues).toEqual([]);
    expect(check(count, "회원 700000명").validationIssues).toEqual([]);
    for (const [record, text] of [
      [{ ...count, unit: undefined }, "회원 70만명"],
      [{ ...count, unit: "minute" }, "회원 70만명"],
      [count, "회원 71만명"],
      [count, "회원 70억명"],
      [count, "70개월"],
    ] as const) {
      expect(check(record, text).validationIssues).toContainEqual({
        code: "UNSUPPORTED_NUMERIC_FACT",
        sourceIds: ["profile"],
      });
    }
  });
  it("원문 경력 연수와 개월 수에 해당 단위를 붙이면 통과하고 값을 바꾸거나 단위를 뒤바꾸면 거부한다", () => {
    for (const [name, value, valid, invalid] of [
      ["reportedYears", "7", "7년", "7개월"],
      ["reportedMonths", "3", "3개월", "3년"],
    ]) {
      const record = { ...source, name, text: value };
      const check = (text: string) =>
        checkResumeEvidence(
          [record],
          [
            {
              text,
              sourceIds: ["profile"],
              evidence: [{ sourceId: "profile", quote: value }],
            },
          ],
        );
      expect(check(valid).validationIssues).toEqual([]);
      expect(check(invalid).validationIssues).toContainEqual({
        code: "UNSUPPORTED_NUMERIC_FACT",
        sourceIds: ["profile"],
      });
      expect(check("9년").validationIssues).toContainEqual({
        code: "UNSUPPORTED_NUMERIC_FACT",
        sourceIds: ["profile"],
      });
    }
  });
  it("인원 단위 사이에 공백이 있어도 배수 변경을 거부하고 다른 필드의 숫자에는 인원 단위를 붙이지 않는다", () => {
    for (const [name, text] of [
      ["memberCount", "6 만 명"],
      ["version", "6명"],
    ]) {
      const record = { ...source, name, text: "6" };
      expect(
        checkResumeEvidence(
          [record],
          [
            {
              text,
              sourceIds: ["profile"],
              evidence: [{ sourceId: "profile", quote: "6" }],
            },
          ],
        ).validationIssues,
      ).toContainEqual({
        code: "UNSUPPORTED_NUMERIC_FACT",
        sourceIds: ["profile"],
      });
    }
  });
  it("숫자 검증이 실패하면 문장 위치와 비교값을 진단으로 남긴다", () => {
    const result = checkResumeEvidence(
      [{ ...source, text: "조회율 30%" }],
      [
        {
          text: "조회율 50%",
          sourceIds: ["profile"],
          formItem: "name",
          evidence: [{ sourceId: "profile", quote: "조회율 30%" }],
        },
      ],
    );
    expect(result).toMatchObject({
      diagnostics: [
        {
          claimIndex: 0,
          text: "조회율 50%",
          formItem: "name",
          code: "UNSUPPORTED_NUMERIC_FACT",
          sourceIds: ["profile"],
          numeric: { expected: ["30%"], actual: ["50%"], unsupported: ["50%"] },
        },
      ],
    });
  });
  it("구조화된 날짜·출생 연도·인원을 같은 의미로 표시하면 통과하고 값이나 단위를 바꾸면 거부한다", () => {
    const node = (name: string, text: string): ResumeSelectionNode => ({
      ...source,
      id: undefined,
      name,
      text,
    });
    const record = {
      ...source,
      text: "",
      children: [
        node("birthYear", "1998"),
        node("start", "2022-10"),
        node("end", "2026-04"),
        node("memberCount", "6"),
      ],
    };
    const evidence = record.children.map((child) => ({
      sourceId: "profile",
      quote: child.text,
    }));
    for (const text of [
      "1998년 출생, 2022년 10월부터 2026년 4월까지 6명과 일했습니다",
      "2022-10부터 2026-04까지 일했습니다",
    ]) {
      expect(
        checkResumeEvidence(
          [record],
          [{ text, sourceIds: ["profile"], evidence }],
        ).validationIssues,
      ).toEqual([]);
    }
    for (const text of [
      "1999년 출생",
      "2022년 4월부터 2026년 10월까지 일했습니다",
      "6개월간 일했습니다",
      "6만명과 일했습니다",
      "6% 개선했습니다",
    ]) {
      expect(
        checkResumeEvidence(
          [record],
          [{ text, sourceIds: ["profile"], evidence }],
        ).validationIssues,
      ).toContainEqual({
        code: "UNSUPPORTED_NUMERIC_FACT",
        sourceIds: ["profile"],
      });
    }
  });
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
