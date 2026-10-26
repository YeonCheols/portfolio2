import {
  checkResumeDraft,
  type ResumeSelectionNode,
} from "@mcp/resume/output/checkResumeDraft";

const profile: ResumeSelectionNode = {
  id: "profile-test",
  section: "profile",
  name: "profile",
  text: "",
  sourceRefs: ["source-page-1"],
  visibility: "private",
  children: [
    {
      section: "profile",
      name: "headline",
      text: "재사용 가능한  컴포넌트",
      sourceRefs: [],
      visibility: "public",
      children: [],
    },
    {
      section: "profile",
      name: "email",
      text: "hidden@example.com",
      sourceRefs: [],
      visibility: "private",
      children: [],
    },
  ],
};

describe("checkResumeDraft", () => {
  it("근거가 있는 문장은 그 원소의 원문 출처 공개 여부를 유지한다", () => {
    const result = checkResumeDraft(
      [profile],
      [
        {
          text: "컴포넌트를 재사용할 수 있습니다",
          sourceIds: ["profile-test"],
        },
      ],
    );

    expect(result.claims).toEqual([
      {
        text: "컴포넌트를 재사용할 수 있습니다",
        sourceIds: ["profile-test"],
        sources: [profile],
      },
    ]);
    expect(JSON.stringify(result)).toContain("hidden@example.com");
    expect(JSON.stringify(result)).toContain("재사용 가능한  컴포넌트");
  });

  it("근거 id가 없거나 선택에 없으면 그 문장을 사실에서 빼고 누락으로 둔다", () => {
    const result = checkResumeDraft(
      [profile],
      [
        { text: "근거 없는 성과입니다", sourceIds: [] },
        { text: "없는 원소입니다", sourceIds: ["missing-id"] },
      ],
    );

    expect(result.claims).toEqual([]);
    expect(result.gaps).toEqual([
      { text: "근거 없는 성과입니다", sourceIds: [] },
      { text: "없는 원소입니다", sourceIds: ["missing-id"] },
    ]);
  });

  it("노드와 자식의 원문이 모두 비어 있으면 그 문장을 누락으로 둔다", () => {
    const empty: ResumeSelectionNode = {
      id: "employment-empty",
      section: "employmentHistory",
      name: "employment",
      text: "",
      sourceRefs: [],
      visibility: "public",
      children: [
        {
          section: "employmentHistory",
          name: "organization",
          text: "",
          sourceRefs: [],
          visibility: "public",
          children: [],
        },
      ],
    };

    const result = checkResumeDraft(
      [empty],
      [{ text: "회사가 있습니다", sourceIds: ["employment-empty"] }],
    );

    expect(result.claims).toEqual([]);
    expect(result.gaps).toEqual([
      { text: "회사가 있습니다", sourceIds: ["employment-empty"] },
    ]);
  });

  it("같은 원소 id의 서로 다른 문장은 하나로 고르지 않고 충돌로 둔다", () => {
    const result = checkResumeDraft(
      [profile],
      [
        { text: "컴포넌트를 만들었습니다", sourceIds: ["profile-test"] },
        { text: "화면을 설계했습니다", sourceIds: ["profile-test"] },
      ],
    );

    expect(result.claims).toEqual([]);
    expect(result.conflicts).toEqual([
      {
        sourceId: "profile-test",
        texts: ["컴포넌트를 만들었습니다", "화면을 설계했습니다"],
      },
    ]);
  });

  it("서로 다른 실제 항목은 각각 검증하고 원문에 없는 항목은 누락으로 둔다", () => {
    const result = checkResumeDraft(
      [profile],
      [
        {
          text: "기술을 재사용했습니다",
          sourceIds: ["profile-test"],
          formItem: "headline",
        },
        {
          text: "이메일을 사용했습니다",
          sourceIds: ["profile-test"],
          formItem: "email",
        },
        {
          text: "자격증을 보유했습니다",
          sourceIds: ["profile-test"],
          formItem: "certification",
        },
      ],
    );

    expect(result.claims.map(({ formItem }) => formItem)).toEqual([
      "headline",
      "email",
    ]);
    expect(result.gaps).toEqual([
      {
        text: "자격증을 보유했습니다",
        sourceIds: ["profile-test"],
        formItem: "certification",
      },
    ]);
    expect(result.conflicts).toEqual([]);
  });

  it("서로 다른 프로젝트를 묶은 문장은 누락으로 둔다", () => {
    const project = (id: string, title: string): ResumeSelectionNode => ({
      id,
      section: "projects",
      name: "project",
      text: "",
      sourceRefs: [],
      visibility: "public",
      children: [
        {
          section: "projects",
          name: "title",
          text: title,
          sourceRefs: [],
          visibility: "public",
          children: [],
        },
        {
          section: "projects",
          name: "technicalStructure",
          text: `${title} 구조`,
          sourceRefs: [],
          visibility: "public",
          children: [],
        },
      ],
    });
    const firstProject = project("project-first", "첫 프로젝트");
    const secondProject = project("project-second", "둘째 프로젝트");

    const result = checkResumeDraft(
      [firstProject, secondProject],
      [
        {
          text: "두 프로젝트의 구조를 통합했습니다",
          sourceIds: ["project-first", "project-second"],
          formItem: "technicalStructure",
        },
      ],
    );

    expect(result.claims).toEqual([]);
    expect(result.gaps).toEqual([
      {
        text: "두 프로젝트의 구조를 통합했습니다",
        sourceIds: ["project-first", "project-second"],
        formItem: "technicalStructure",
      },
    ]);
  });

  it("공개 여부가 빈 문자열인 근거는 공개로 바꾸지 않고 확인 대상으로 둔다", () => {
    const employment: ResumeSelectionNode = {
      id: "employment-open",
      section: "employmentHistory",
      name: "employment",
      text: "회사 원문",
      sourceRefs: ["source-page-1"],
      visibility: "",
      children: [],
    };

    const result = checkResumeDraft(
      [employment],
      [{ text: "회사에서 일했습니다", sourceIds: ["employment-open"] }],
    );

    expect(result.claims[0]?.sources[0]?.visibility).toBe("");
    expect(result.uncertain).toEqual([
      { id: "employment-open", visibility: "" },
    ]);
  });
});
