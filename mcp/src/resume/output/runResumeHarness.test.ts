import type { ResumeSelectionNode } from "@mcp/resume/output/checkResumeDraft";
import {
  generateResume,
  resumeWriterPersona,
  runResumeHarness,
  type ResumeModelRequest,
} from "@mcp/resume/output/runResumeHarness";

const employment: ResumeSelectionNode = {
  id: "employment-selected",
  section: "employmentHistory",
  name: "employment",
  text: "",
  sourceRefs: ["source-page-1"],
  visibility: "private",
  children: [
    {
      section: "employmentHistory",
      name: "organization",
      text: "선택한 회사",
      sourceRefs: [],
      visibility: "public",
      children: [],
    },
  ],
};

const recordingClient = (responses: string[]) => {
  const requests: ResumeModelRequest[] = [];
  return {
    requests,
    generate: async (input: ResumeModelRequest) => {
      requests.push(input);
      return responses[requests.length - 1] ?? "";
    },
  };
};

describe("runResumeHarness", () => {
  const source = (
    id: string,
    section: string,
    name = section,
  ): ResumeSelectionNode => ({
    id,
    section,
    name,
    text: `${name} 원문`,
    sourceRefs: [],
    visibility: "public",
    children: [],
  });

  it("검사를 통과한 프로필 문장을 프로필 절 아래에 배치한다", async () => {
    const result = await generateResume(
      [
        {
          id: "profile-selected",
          section: "profile",
          name: "profile",
          text: "테스트 사용자",
          sourceRefs: [],
          visibility: "public",
          children: [],
        },
      ],
      {
        claims: [
          {
            text: "테스트 사용자입니다",
            sourceIds: ["profile-selected"],
          },
        ],
      },
    );

    expect("resume" in result).toBe(true);
    if (!("resume" in result)) return;
    expect(result.resume).toBe("프로필\n테스트 사용자입니다");
  });

  it("공백뿐인 claim은 근거가 있어도 최종 절 제목을 만들지 않는다", async () => {
    const result = await generateResume(
      [source("profile-empty-claim", "profile")],
      {
        claims: [{ text: "   ", sourceIds: ["profile-empty-claim"] }],
      },
    );

    expect("resume" in result).toBe(true);
    if (!("resume" in result)) return;
    expect(result.resume).toBe("");
    expect(result.gaps).toEqual([
      { text: "   ", sourceIds: ["profile-empty-claim"] },
    ]);
  });

  it("프로필 항목 문장은 원문에 있는 항목 제목 아래에만 배치한다", async () => {
    const profile: ResumeSelectionNode = {
      id: "profile-items",
      section: "profile",
      name: "profile",
      text: "",
      sourceRefs: [],
      visibility: "public",
      children: [
        {
          section: "profile",
          name: "name",
          text: "테스트 사용자",
          sourceRefs: [],
          visibility: "public",
          children: [],
        },
        {
          section: "profile",
          name: "email",
          text: "test@example.com",
          sourceRefs: [],
          visibility: "private",
          children: [],
        },
      ],
    };
    const client = recordingClient([
      JSON.stringify({
        elements: [
          { id: "profile-items", interpretation: "프로필을 소개한다" },
        ],
      }),
      JSON.stringify({
        claims: [
          {
            text: "테스트 사용자입니다",
            sourceIds: ["profile-items"],
            formItem: "name",
          },
          {
            text: "이메일은 test@example.com입니다",
            sourceIds: ["profile-items"],
            formItem: "email",
          },
          {
            text: "존재하지 않는 필드입니다",
            sourceIds: ["profile-items"],
            formItem: "awards",
          },
        ],
      }),
    ]);

    const result = await runResumeHarness([profile], client);

    expect(client.requests[1]?.prompt).toContain('"name"');
    expect(client.requests[1]?.prompt).not.toContain("test@example.com");
    expect(result.resume).toBe(
      "프로필\n이름\n테스트 사용자입니다\n이메일\n이메일은 test@example.com입니다",
    );
  });

  it("검사를 통과한 문장을 확인된 양식 절 순서로 배치하고 미매핑 절을 생략한다", async () => {
    const selection = [
      source("portfolio", "portfolioReferences"),
      source("employment", "employmentHistory"),
      source("field", "employmentPreferences", "role"),
      source("profile", "profile"),
      source("activity", "activities"),
      source("unknown", "unknownSection"),
      source("education", "educationHistory"),
      source("project", "projects"),
      source("training", "trainingHistory"),
      source("certificate", "certifications"),
      source("statement", "personalStatements"),
      source("eligibility", "employmentEligibility", "militaryService"),
      source("preferences", "employmentPreferences"),
    ];
    const result = await generateResume(selection, {
      claims: selection.map((item) => ({
        text: `${item.name} 문장`,
        sourceIds: [item.id ?? ""],
      })),
    });

    expect("resume" in result).toBe(true);
    if (!("resume" in result)) return;
    expect(result.resume).toBe(
      [
        "프로필",
        "profile 문장",
        "학력",
        "educationHistory 문장",
        "경력",
        "employmentHistory 문장",
        "projects 문장",
        "인턴·대외활동",
        "activities 문장",
        "교육",
        "trainingHistory 문장",
        "자격증",
        "certifications 문장",
        "자기소개서",
        "personalStatements 문장",
        "포트폴리오",
        "portfolioReferences 문장",
        "병역사항",
        "militaryService 문장",
        "희망근무조건",
        "employmentPreferences 문장",
        "지원분야",
        "role 문장",
      ].join("\n"),
    );
    expect(result.resume).not.toContain("unknownSection");
  });

  it("병역사항에는 군 복무 claim만 출력한다", async () => {
    const selection = [
      source("military", "employmentEligibility", "militaryService"),
      source("veteran", "employmentEligibility", "veteran"),
    ];
    const result = await generateResume(selection, {
      claims: [
        { text: "병역은 해당 없음입니다", sourceIds: ["military"] },
        { text: "보훈 대상입니다", sourceIds: ["veteran"] },
      ],
    });

    expect("resume" in result).toBe(true);
    if (!("resume" in result)) return;
    expect(result.resume).toBe("병역사항\n병역은 해당 없음입니다");
  });

  it("프로젝트 항목과 자기소개서 제목을 확인된 하위 제목으로 배치한다", async () => {
    const project: ResumeSelectionNode = {
      id: "project-items",
      section: "projects",
      name: "project",
      text: "",
      sourceRefs: [],
      visibility: "public",
      children: [
        {
          section: "projects",
          name: "team",
          text: "프론트엔드 팀",
          sourceRefs: [],
          visibility: "public",
          children: [],
        },
        {
          section: "projects",
          name: "role",
          text: "개발 담당",
          sourceRefs: [],
          visibility: "public",
          children: [],
        },
        {
          section: "projects",
          name: "summary",
          text: "서비스 개편 프로젝트",
          sourceRefs: [],
          visibility: "public",
          children: [],
        },
        {
          section: "projects",
          name: "responsibility",
          text: "화면 구조를 개선했습니다",
          sourceRefs: [],
          visibility: "public",
          children: [],
        },
        {
          section: "projects",
          name: "technologyRefs",
          text: "",
          sourceRefs: [],
          visibility: "public",
          children: [
            {
              section: "projects",
              name: "use",
              text: "React",
              sourceRefs: [],
              visibility: "public",
              children: [],
            },
          ],
        },
        {
          section: "projects",
          name: "period",
          text: "2024-01 ~ 2024-06",
          sourceRefs: [],
          visibility: "public",
          children: [],
        },
        {
          section: "projects",
          name: "link",
          text: "https://example.com",
          sourceRefs: [],
          visibility: "public",
          children: [],
        },
        {
          section: "projects",
          name: "domains",
          text: "",
          sourceRefs: [],
          visibility: "public",
          children: [
            {
              section: "projects",
              name: "domain",
              text: "이력서",
              sourceRefs: [],
              visibility: "public",
              children: [],
            },
          ],
        },
        {
          section: "projects",
          name: "technicalStructure",
          text: "기능별 경계를 나누고 API로 연결했습니다",
          sourceRefs: [],
          visibility: "public",
          children: [],
        },
        {
          section: "projects",
          name: "projectApproach",
          text: "단계별 검증 후 점진적으로 배포했습니다",
          sourceRefs: [],
          visibility: "public",
          children: [],
        },
      ],
    };
    const statement: ResumeSelectionNode = {
      id: "statement-item",
      section: "personalStatements",
      name: "statement",
      text: "",
      sourceRefs: [],
      visibility: "public",
      children: [
        {
          section: "personalStatements",
          name: "title",
          text: "목표 및 포부",
          sourceRefs: [],
          visibility: "public",
          children: [],
        },
        {
          section: "personalStatements",
          name: "text",
          text: "제품을 더 쉽게 사용하는 경험을 만들고 싶습니다",
          sourceRefs: [],
          visibility: "public",
          children: [],
        },
      ],
    };
    const selection = [project, statement];
    const result = await generateResume(selection, {
      claims: [
        ...[
          ["team", "팀에서 일했습니다"],
          ["role", "프론트엔드 개발을 맡았습니다"],
          ["summary", "서비스를 개편했습니다"],
          ["responsibility", "화면 구조를 개선했습니다"],
          ["use", "React를 사용했습니다"],
          ["period", "6개월간 진행했습니다"],
          ["link", "서비스를 공개했습니다"],
          ["domain", "이력서 영역을 담당했습니다"],
          ["technicalStructure", "기술 경계를 설계했습니다"],
          ["projectApproach", "단계별로 배포했습니다"],
        ].map(([formItem, text]) => ({
          formItem,
          text,
          sourceIds: ["project-items"],
        })),
        {
          text: "제품 사용 경험을 개선하고 싶습니다",
          sourceIds: ["statement-item"],
          formItem: "목표 및 포부",
        },
      ],
    });

    expect("resume" in result).toBe(true);
    if (!("resume" in result)) return;
    expect(result.resume).toBe(
      [
        "경력",
        "팀/역할",
        "팀에서 일했습니다",
        "프론트엔드 개발을 맡았습니다",
        "전체 내용",
        "서비스를 개편했습니다",
        "기술적 구조",
        "기술 경계를 설계했습니다",
        "프로젝트 내용",
        "화면 구조를 개선했습니다",
        "사용 기술",
        "React를 사용했습니다",
        "기간",
        "6개월간 진행했습니다",
        "사이트 URL",
        "서비스를 공개했습니다",
        "프로젝트 진행 방식",
        "단계별로 배포했습니다",
        "담당 개발 도메인",
        "이력서 영역을 담당했습니다",
        "자기소개서",
        "목표 및 포부",
        "제품 사용 경험을 개선하고 싶습니다",
      ].join("\n"),
    );
  });

  it("같은 프로젝트 항목도 각 프로젝트 제목 아래에 따로 배치한다", async () => {
    const project = (
      id: string,
      title: string,
      technicalStructure: string,
      projectApproach: string,
    ): ResumeSelectionNode => ({
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
          id: `${id}-technical-structure`,
          section: "projects",
          name: "technicalStructure",
          text: technicalStructure,
          sourceRefs: [],
          visibility: "public",
          children: [],
        },
        {
          id: `${id}-project-approach`,
          section: "projects",
          name: "projectApproach",
          text: projectApproach,
          sourceRefs: [],
          visibility: "public",
          children: [],
        },
      ],
    });
    const selection = [
      project("project-a", "첫 프로젝트", "첫 구조", "첫 진행 방식"),
      project("project-b", "둘째 프로젝트", "둘째 구조", "둘째 진행 방식"),
    ];

    const result = await generateResume(selection, {
      claims: selection.flatMap((item, index) => [
        {
          text: `${index === 0 ? "첫" : "둘째"} 구조 설명입니다`,
          sourceIds: [
            index === 0 ? (item.id ?? "") : (item.children[1]?.id ?? ""),
          ],
          formItem: "technicalStructure",
        },
        {
          text: `${index === 0 ? "첫" : "둘째"} 진행 방식 설명입니다`,
          sourceIds: [
            index === 0 ? (item.id ?? "") : (item.children[2]?.id ?? ""),
          ],
          formItem: "projectApproach",
        },
      ]),
    });

    expect("resume" in result).toBe(true);
    if (!("resume" in result)) return;
    expect(result.resume).toBe(
      [
        "경력",
        "첫 프로젝트",
        "기술적 구조",
        "첫 구조 설명입니다",
        "프로젝트 진행 방식",
        "첫 진행 방식 설명입니다",
        "둘째 프로젝트",
        "기술적 구조",
        "둘째 구조 설명입니다",
        "프로젝트 진행 방식",
        "둘째 진행 방식 설명입니다",
      ].join("\n"),
    );
  });

  it("생성 요청의 첫 단계는 이력서 전문 작성자 역할로 원소를 해석한다", async () => {
    const client = recordingClient([
      JSON.stringify({
        elements: [
          {
            id: "employment-selected",
            interpretation: "선택한 회사에서 일했다",
          },
        ],
      }),
    ]);

    await runResumeHarness([employment], client);

    expect(client.requests[0]?.persona).toBe(resumeWriterPersona);
    expect(resumeWriterPersona).toContain("이력서 전문 작성자");
    expect(resumeWriterPersona).toContain("XML에 없는");
    expect(client.requests[0]?.prompt).toContain("해석");
    expect(client.requests[0]?.prompt).toContain("employment-selected");
    expect(client.requests[0]?.prompt).toContain("선택한 회사");
  });

  it("해석 뒤에 다시 쓴 문장 중 검사를 통과한 것만 최종 이력서에 남긴다", async () => {
    const client = recordingClient([
      JSON.stringify({
        elements: [
          {
            id: "employment-selected",
            interpretation: "선택한 회사에서 일했다",
          },
        ],
      }),
      JSON.stringify({
        claims: [
          {
            text: "선택한 회사에서 일했습니다",
            sourceIds: ["employment-selected"],
          },
          { text: "없는 성과를 냈습니다", sourceIds: ["missing-id"] },
        ],
      }),
    ]);

    const result = await runResumeHarness([employment], client);

    expect(client.requests).toHaveLength(2);
    expect(client.requests[1]?.persona).toBe(resumeWriterPersona);
    expect(client.requests[1]?.prompt).toContain("재작성");
    expect(client.requests[1]?.prompt).toContain("선택한 회사에서 일했다");
    expect(client.requests[1]?.prompt).toContain("서로 다른 프로젝트");
    expect(result.resume).toBe("경력\n선택한 회사에서 일했습니다");
    expect(result.resume).not.toContain("없는 성과");
    expect(result.claims[0]?.sources[0]?.sourceRefs).toEqual(["source-page-1"]);
    expect(result.claims[0]?.sources[0]?.visibility).toBe("private");
    expect(JSON.stringify(result.claims)).toContain("선택한 회사");
  });

  it("양식의 각 섹션을 따로 해석하고 다시 쓴 문장을 양식 절에 배치한다", async () => {
    const profile: ResumeSelectionNode = {
      id: "profile-test",
      section: "profile",
      name: "profile",
      text: "",
      sourceRefs: [],
      visibility: "public",
      children: [
        {
          section: "profile",
          name: "name",
          text: "테스트 사용자",
          sourceRefs: [],
          visibility: "public",
          children: [],
        },
      ],
    };
    const client = recordingClient([
      JSON.stringify({
        elements: [{ id: "profile-test", interpretation: "이름을 소개한다" }],
      }),
      JSON.stringify({
        claims: [{ text: "테스트 사용자입니다", sourceIds: ["profile-test"] }],
      }),
      JSON.stringify({
        elements: [
          {
            id: "employment-selected",
            interpretation: "선택한 회사에서 일했다",
          },
        ],
      }),
      JSON.stringify({
        claims: [
          {
            text: "선택한 회사에서 일했습니다",
            sourceIds: ["employment-selected"],
          },
        ],
      }),
    ]);

    const result = await runResumeHarness([profile, employment], client, [
      { section: "profile", text: "프로필\n이름 테스트 사용자" },
      { section: "employmentHistory", text: "경력\n회사 선택한 회사" },
    ]);

    expect(client.requests).toHaveLength(4);
    expect(client.requests[0]?.prompt).toContain("이름 테스트 사용자");
    expect(client.requests[0]?.prompt).not.toContain("회사 선택한 회사");
    expect(client.requests[2]?.prompt).toContain("회사 선택한 회사");
    expect(client.requests[2]?.prompt).not.toContain("이름 테스트 사용자");
    expect(result.resume).toBe(
      "프로필\n테스트 사용자입니다\n경력\n선택한 회사에서 일했습니다",
    );
  });

  it("해석 결과가 없으면 문장을 다시 쓰지 않는다", async () => {
    const client = recordingClient([
      JSON.stringify({ elements: [] }),
      JSON.stringify({
        claims: [
          {
            text: "없는 성과를 냈습니다",
            sourceIds: ["employment-selected"],
          },
        ],
      }),
    ]);

    const result = await runResumeHarness([employment], client);

    expect(client.requests).toHaveLength(1);
    expect(result.resume).toBe("");
  });
});
