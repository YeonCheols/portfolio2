import { ResumeConnectionError } from "@mcp/resume/connection/resumeConnection";
import { connectedResume, resumeNode } from "@mcp/resume/testing/resumeFixture";
import {
  callResumeTool,
  type ResumeConnection,
} from "@mcp/resume/tools/resumeTools";

const connection: ResumeConnection = {
  load: async (input) => {
    if (!input.xml?.includes('schemaVersion="0.2.0"')) {
      throw new ResumeConnectionError("MALFORMED_XML");
    }

    return connectedResume();
  },
};

describe("callResumeTool", () => {
  it("연결이 거부한 XML은 오류 코드만 반환하고 이력서를 만들지 않는다", async () => {
    const xml = "<resumeAsset><profile></resumeAsset>";

    const result = await callResumeTool(
      "validate_resume_xml",
      { source: "embedded", xml },
      connection,
    );

    expect(result).toEqual({ ok: false, code: "MALFORMED_XML" });
    expect(JSON.stringify(result)).not.toContain("<profile>");
  });

  it("미리보기 도구는 연결로 받은 모델에서 선택한 원소의 원문만 반환한다", async () => {
    const result = await callResumeTool(
      "preview_resume",
      {
        source: "embedded",
        xml: 'schemaVersion="0.2.0"',
        elementIds: ["profile-test"],
        sectionOrder: ["profile"],
      },
      connection,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.text).toContain("테스트 사용자");
    expect(result.text).not.toContain("포함되면 안 되는 회사");
  });

  it("템플릿 도구는 선택한 employment의 organization 이름과 원문을 함께 보여주고 선택하지 않은 회사는 빼 준다", async () => {
    const result = await callResumeTool(
      "render_resume_template",
      {
        source: "embedded",
        xml: 'schemaVersion="0.2.0"',
        template: "기본형",
        elementIds: ["employment-selected"],
        sectionOrder: ["employmentHistory"],
      },
      {
        load: async () => ({
          ...connectedResume(),
          sections: {
            employmentHistory: [
              resumeNode("employmentHistory", {
                children: [
                  resumeNode("employment", {
                    attributes: { id: "employment-selected" },
                    children: [
                      resumeNode("organization", { text: "선택한 회사" }),
                    ],
                  }),
                  resumeNode("employment", {
                    attributes: { id: "employment-other" },
                    children: [
                      resumeNode("organization", { text: "제외된 회사" }),
                    ],
                  }),
                ],
              }),
            ],
          },
        }),
      },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.text).toContain("organization 선택한 회사");
    expect(result.text).not.toContain("제외된 회사");
  });

  it("기본형과 경력 중심형과 프로젝트 중심형만 받고 다른 템플릿 이름은 오류 코드만 반환한다", async () => {
    const load = async () =>
      ({
        ...connectedResume(),
        sections: {
          employmentHistory: [
            resumeNode("employmentHistory", {
              children: [
                resumeNode("employment", {
                  attributes: { id: "employment-selected" },
                  children: [
                    resumeNode("organization", { text: "선택한 회사" }),
                  ],
                }),
              ],
            }),
          ],
        },
      }) satisfies Awaited<ReturnType<ResumeConnection["load"]>>;

    for (const template of ["기본형", "경력 중심형", "프로젝트 중심형"]) {
      const result = await callResumeTool(
        "render_resume_template",
        {
          source: "embedded",
          xml: 'schemaVersion="0.2.0"',
          template,
          elementIds: ["employment-selected"],
          sectionOrder: ["employmentHistory"],
        },
        { load },
      );

      expect(result.ok).toBe(true);
    }

    const rejected = await callResumeTool(
      "render_resume_template",
      {
        source: "embedded",
        xml: 'schemaVersion="0.2.0"',
        template: "없는형",
        elementIds: ["employment-selected"],
        sectionOrder: ["employmentHistory"],
      },
      { load },
    );

    expect(rejected).toEqual({ ok: false, code: "UNKNOWN_TEMPLATE" });
    expect(JSON.stringify(rejected)).not.toContain("선택한 회사");
  });

  it("템플릿 출력은 headline의 띄어쓰기 없는 원문을 그대로 둔다", async () => {
    const headline =
      "재사용 가능한 컴포넌트 설계와 개발 생산성 향상에 관심이 많은 5년차프론트엔드 개발자입니다";
    const result = await callResumeTool(
      "render_resume_template",
      {
        source: "embedded",
        xml: 'schemaVersion="0.2.0"',
        template: "기본형",
        elementIds: ["profile-test"],
        sectionOrder: ["profile"],
      },
      {
        load: async () =>
          connectedResume([
            resumeNode("headline", { text: headline }),
            resumeNode("name", { text: "테스트 사용자" }),
          ]),
      },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.text).toContain(`headline ${headline}`);
  });

  it("양식 도구의 기본형은 선택한 회사를 이력서 항목명과 원문으로 보여주고 선택하지 않은 회사와 XML 원소 이름은 빼 준다", async () => {
    const result = await callResumeTool(
      "render_resume_form",
      {
        source: "embedded",
        xml: 'schemaVersion="0.2.0"',
        template: "기본형",
        elementIds: ["employment-selected"],
        sectionOrder: ["employmentHistory"],
      },
      {
        load: async () => ({
          ...connectedResume(),
          sections: {
            employmentHistory: [
              resumeNode("employmentHistory", {
                children: [
                  resumeNode("employment", {
                    attributes: { id: "employment-selected" },
                    children: [
                      resumeNode("organization", { text: "선택한 회사" }),
                    ],
                  }),
                  resumeNode("employment", {
                    attributes: { id: "employment-other" },
                    children: [
                      resumeNode("organization", { text: "제외된 회사" }),
                    ],
                  }),
                ],
              }),
            ],
          },
        }),
      },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.text).toContain("기본형");
    expect(result.text).toContain("경력");
    expect(result.text).toContain("회사 선택한 회사");
    expect(result.text).not.toContain("제외된 회사");
    expect(result.text).not.toContain("organization");
  });

  it("경력 중심형은 선택한 경력과 연결된 프로젝트만 보여주고 연결과 무관한 프로젝트와 프로필은 빼 준다", async () => {
    const result = await callResumeTool(
      "render_resume_form",
      {
        source: "embedded",
        xml: 'schemaVersion="0.2.0"',
        template: "경력 중심형",
        elementIds: [
          "profile-test",
          "employment-selected",
          "project-linked",
          "project-other",
        ],
        sectionOrder: ["profile", "employmentHistory", "projects"],
      },
      {
        load: async () => ({
          ...connectedResume([resumeNode("name", { text: "테스트 사용자" })]),
          sections: {
            ...connectedResume([resumeNode("name", { text: "테스트 사용자" })])
              .sections,
            employmentHistory: [
              resumeNode("employmentHistory", {
                children: [
                  resumeNode("employment", {
                    attributes: { id: "employment-selected" },
                    children: [
                      resumeNode("organization", { text: "선택한 회사" }),
                    ],
                  }),
                  resumeNode("employment", {
                    attributes: { id: "employment-other" },
                    children: [
                      resumeNode("organization", { text: "다른 회사" }),
                    ],
                  }),
                ],
              }),
            ],
            projects: [
              resumeNode("projects", {
                children: [
                  resumeNode("project", {
                    attributes: {
                      id: "project-linked",
                      employmentRef: "employment-selected",
                    },
                    references: { employmentRef: ["employment-selected"] },
                    children: [
                      resumeNode("title", { text: "연결된 프로젝트" }),
                    ],
                  }),
                  resumeNode("project", {
                    attributes: {
                      id: "project-other",
                      employmentRef: "employment-other",
                    },
                    references: { employmentRef: ["employment-other"] },
                    children: [
                      resumeNode("title", { text: "분리된 프로젝트" }),
                    ],
                  }),
                ],
              }),
            ],
          },
        }),
      },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.text).toContain("회사 선택한 회사");
    expect(result.text).toContain("프로젝트 연결된 프로젝트");
    expect(result.text).not.toContain("테스트 사용자");
    expect(result.text).not.toContain("분리된 프로젝트");
    expect(result.text).not.toContain("다른 회사");
  });

  it("프로젝트 중심형은 선택한 프로젝트와 연결된 경력만 보여주고 연결과 무관한 경력은 빼 준다", async () => {
    const result = await callResumeTool(
      "render_resume_form",
      {
        source: "embedded",
        xml: 'schemaVersion="0.2.0"',
        template: "프로젝트 중심형",
        elementIds: [
          "employment-linked",
          "employment-other",
          "project-selected",
        ],
        sectionOrder: ["employmentHistory", "projects"],
      },
      {
        load: async () => ({
          ...connectedResume(),
          sections: {
            employmentHistory: [
              resumeNode("employmentHistory", {
                children: [
                  resumeNode("employment", {
                    attributes: { id: "employment-linked" },
                    children: [
                      resumeNode("organization", { text: "연결된 회사" }),
                    ],
                  }),
                  resumeNode("employment", {
                    attributes: { id: "employment-other" },
                    children: [
                      resumeNode("organization", { text: "분리된 회사" }),
                    ],
                  }),
                ],
              }),
            ],
            projects: [
              resumeNode("projects", {
                children: [
                  resumeNode("project", {
                    attributes: {
                      id: "project-selected",
                      employmentRef: "employment-linked",
                    },
                    references: { employmentRef: ["employment-linked"] },
                    children: [
                      resumeNode("title", { text: "선택한 프로젝트" }),
                    ],
                  }),
                ],
              }),
            ],
          },
        }),
      },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const lines = result.text.split("\n");
    expect(lines[0]).toBe("프로젝트 중심형");
    expect(lines.indexOf("프로젝트")).toBeLessThan(lines.indexOf("경력"));
    expect(result.text).toContain("프로젝트 선택한 프로젝트");
    expect(result.text).toContain("회사 연결된 회사");
    expect(result.text).not.toContain("분리된 회사");
  });

  it("양식 도구는 세 이력서 양식만 받고 다른 이름은 오류 코드만 반환한다", async () => {
    const load = async () =>
      ({
        ...connectedResume(),
        sections: {
          employmentHistory: [
            resumeNode("employmentHistory", {
              children: [
                resumeNode("employment", {
                  attributes: { id: "employment-selected" },
                  children: [
                    resumeNode("organization", { text: "선택한 회사" }),
                  ],
                }),
              ],
            }),
          ],
        },
      }) satisfies Awaited<ReturnType<ResumeConnection["load"]>>;

    for (const template of ["기본형", "경력 중심형", "프로젝트 중심형"]) {
      const result = await callResumeTool(
        "render_resume_form",
        {
          source: "embedded",
          xml: 'schemaVersion="0.2.0"',
          template,
          elementIds: ["employment-selected"],
          sectionOrder: ["employmentHistory"],
        },
        { load },
      );
      expect(result.ok).toBe(true);
    }

    const rejected = await callResumeTool(
      "render_resume_form",
      {
        source: "embedded",
        xml: 'schemaVersion="0.2.0"',
        template: "없는형",
        elementIds: ["employment-selected"],
        sectionOrder: ["employmentHistory"],
      },
      { load },
    );

    expect(rejected).toEqual({ ok: false, code: "UNKNOWN_TEMPLATE" });
    expect(JSON.stringify(rejected)).not.toContain("선택한 회사");
  });

  it("기본형은 프로필 학력 경력 프로젝트 순서로 항목명을 붙이고 원문 띄어쓰기와 선택 밖 섹션을 유지한다", async () => {
    const headline = "5년차프론트엔드";
    const result = await callResumeTool(
      "render_resume_form",
      {
        source: "embedded",
        xml: 'schemaVersion="0.2.0"',
        template: "기본형",
        elementIds: [
          "profile-test",
          "education-selected",
          "employment-selected",
          "project-selected",
          "summary-extra",
        ],
        sectionOrder: [
          "profile",
          "educationHistory",
          "employmentHistory",
          "projects",
          "summaries",
        ],
      },
      {
        load: async () => ({
          ...connectedResume([
            resumeNode("name", { text: "테스트 사용자" }),
            resumeNode("headline", { text: headline }),
          ]),
          sections: {
            profile: connectedResume([
              resumeNode("name", { text: "테스트 사용자" }),
              resumeNode("headline", { text: headline }),
            ]).sections.profile,
            educationHistory: [
              resumeNode("educationHistory", {
                children: [
                  resumeNode("education", {
                    attributes: { id: "education-selected" },
                    children: [
                      resumeNode("institution", { text: "테스트 학교" }),
                      resumeNode("department", { text: "테스트 학과" }),
                    ],
                  }),
                ],
              }),
            ],
            employmentHistory: [
              resumeNode("employmentHistory", {
                children: [
                  resumeNode("employment", {
                    attributes: { id: "employment-selected" },
                    children: [
                      resumeNode("organization", { text: "선택한 회사" }),
                      resumeNode("department", { text: "개발팀" }),
                      resumeNode("responsibility", {
                        text: "프론트엔드 개발을 담당 하였습니다.",
                      }),
                      resumeNode("period", {
                        children: [
                          resumeNode("start", { text: "2022-10" }),
                          resumeNode("end", { text: "2026-04" }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
            ],
            projects: [
              resumeNode("projects", {
                children: [
                  resumeNode("project", {
                    attributes: { id: "project-selected" },
                    children: [
                      resumeNode("title", { text: "선택한 프로젝트" }),
                    ],
                  }),
                ],
              }),
            ],
            summaries: [
              resumeNode("summaries", {
                children: [
                  resumeNode("summary", {
                    attributes: { id: "summary-extra" },
                    children: [
                      resumeNode("text", { text: "나오면 안 되는 요약" }),
                    ],
                  }),
                ],
              }),
            ],
          },
        }),
      },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const lines = result.text.split("\n");
    expect(lines[0]).toBe("기본형");
    expect(lines.indexOf("프로필")).toBeLessThan(lines.indexOf("학력"));
    expect(lines.indexOf("학력")).toBeLessThan(lines.indexOf("경력"));
    expect(lines.indexOf("경력")).toBeLessThan(lines.indexOf("프로젝트"));
    expect(result.text).toContain(`소개 ${headline}`);
    expect(result.text).toContain("학교 테스트 학교");
    expect(result.text).toContain("학과 테스트 학과");
    expect(result.text).toContain("부서 개발팀");
    expect(result.text).toContain(
      "담당 업무 프론트엔드 개발을 담당 하였습니다.",
    );
    expect(result.text).toContain("기간 2022-10 ~ 2026-04");
    expect(result.text).not.toContain("headline");
    expect(result.text).not.toContain("organization");
    expect(result.text).not.toContain("나오면 안 되는 요약");
  });

  it("원소 조회는 식별자와 출처만 반환하고 원소 본문은 넣지 않는다", async () => {
    const result = await callResumeTool(
      "list_resume_elements",
      { source: "embedded", xml: 'schemaVersion="0.2.0"' },
      connection,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(JSON.parse(result.text)).toEqual(
      expect.arrayContaining([
        {
          id: "profile-test",
          section: "profile",
          name: "profile",
          sourceRefs: ["source-page-1"],
        },
      ]),
    );
    expect(result.text).not.toContain("hidden@example.com");
    expect(result.text).not.toContain("테스트 사용자");
  });

  it("선택 조회는 고른 원소의 식별자 원문 출처 공개 여부를 유지하고 고르지 않은 원소는 빼 준다", async () => {
    const headline = "재사용 가능한  컴포넌트";
    const result = await callResumeTool(
      "read_resume_selection",
      {
        source: "embedded",
        xml: 'schemaVersion="0.2.0"',
        template: "기본형",
        elementIds: ["profile-test"],
        sectionOrder: ["profile", "employmentHistory"],
      },
      {
        load: async () => ({
          ...connectedResume(),
          sections: {
            profile: [
              resumeNode("profile", {
                attributes: {
                  id: "profile-test",
                  sourceRefs: "source-page-1",
                  visibility: "private",
                },
                references: { sourceRefs: ["source-page-1"] },
                children: [
                  resumeNode("headline", {
                    attributes: { visibility: "public" },
                    text: headline,
                  }),
                  resumeNode("email", {
                    attributes: { visibility: "private" },
                    text: "hidden@example.com",
                  }),
                ],
              }),
            ],
            employmentHistory: [
              resumeNode("employmentHistory", {
                children: [
                  resumeNode("employment", {
                    attributes: {
                      id: "employment-hidden",
                      visibility: "private",
                    },
                    children: [
                      resumeNode("organization", { text: "빠지는 회사" }),
                    ],
                  }),
                ],
              }),
            ],
          },
        }),
      },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(JSON.parse(result.text)).toEqual([
      {
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
            text: headline,
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
      },
    ]);
    expect(result.text).not.toContain("빠지는 회사");
  });

  it("선택 조회의 기본형은 공개 여부가 없는 값을 빈 문자열로 두고 프로필을 경력보다 앞에 둔다", async () => {
    const result = await callResumeTool(
      "read_resume_selection",
      {
        source: "embedded",
        xml: 'schemaVersion="0.2.0"',
        template: "기본형",
        elementIds: ["employment-open", "profile-test"],
        sectionOrder: ["employmentHistory", "profile"],
      },
      {
        load: async () => ({
          ...connectedResume(),
          sections: {
            profile: [
              resumeNode("profile", {
                attributes: {
                  id: "profile-test",
                  visibility: "private",
                },
                references: { sourceRefs: ["source-page-1"] },
                text: "프로필 원문",
              }),
            ],
            employmentHistory: [
              resumeNode("employment", {
                attributes: { id: "employment-open" },
                text: "회사 원문",
              }),
            ],
          },
        }),
      },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const selection = JSON.parse(result.text) as {
      id: string;
      visibility: string;
    }[];
    expect(selection.map((item) => item.id)).toEqual([
      "profile-test",
      "employment-open",
    ]);
    expect(selection[0].visibility).toBe("private");
    expect(selection[1].visibility).toBe("");
  });

  it("선택 조회의 경력 중심형은 선택한 경력과 연결된 프로젝트만 남기고 프로필은 빼 준다", async () => {
    const result = await callResumeTool(
      "read_resume_selection",
      {
        source: "embedded",
        xml: 'schemaVersion="0.2.0"',
        template: "경력 중심형",
        elementIds: [
          "profile-test",
          "employment-selected",
          "project-linked",
          "project-other",
        ],
        sectionOrder: ["profile", "employmentHistory", "projects"],
      },
      {
        load: async () => ({
          ...connectedResume([resumeNode("name", { text: "테스트 사용자" })]),
          sections: {
            ...connectedResume([resumeNode("name", { text: "테스트 사용자" })])
              .sections,
            employmentHistory: [
              resumeNode("employmentHistory", {
                children: [
                  resumeNode("employment", {
                    attributes: { id: "employment-selected" },
                    children: [
                      resumeNode("organization", { text: "선택한 회사" }),
                    ],
                  }),
                ],
              }),
            ],
            projects: [
              resumeNode("projects", {
                children: [
                  resumeNode("project", {
                    attributes: {
                      id: "project-linked",
                      employmentRef: "employment-selected",
                    },
                    references: { employmentRef: ["employment-selected"] },
                    children: [
                      resumeNode("title", { text: "연결된 프로젝트" }),
                    ],
                  }),
                  resumeNode("project", {
                    attributes: {
                      id: "project-other",
                      employmentRef: "employment-other",
                    },
                    references: { employmentRef: ["employment-other"] },
                    children: [
                      resumeNode("title", { text: "분리된 프로젝트" }),
                    ],
                  }),
                ],
              }),
            ],
          },
        }),
      },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const ids = (JSON.parse(result.text) as { id: string }[]).map(
      (item) => item.id,
    );
    expect(ids).toEqual(["employment-selected", "project-linked"]);
    expect(result.text).toContain("선택한 회사");
    expect(result.text).toContain("연결된 프로젝트");
    expect(result.text).not.toContain("테스트 사용자");
    expect(result.text).not.toContain("분리된 프로젝트");
  });

  it("초안 검사의 경력 중심형은 선택한 경력과 연결된 프로젝트만 근거로 두고 프로필은 누락으로 둔다", async () => {
    const result = await callResumeTool(
      "check_resume_draft",
      {
        source: "embedded",
        xml: 'schemaVersion="0.2.0"',
        template: "경력 중심형",
        elementIds: [
          "profile-test",
          "employment-selected",
          "project-linked",
          "project-other",
        ],
        sectionOrder: ["profile", "employmentHistory", "projects"],
        claims: [
          { text: "사용자를 소개합니다", sourceIds: ["profile-test"] },
          {
            text: "선택한 회사에서 일했습니다",
            sourceIds: ["employment-selected"],
          },
          { text: "연결된 일을 했습니다", sourceIds: ["project-linked"] },
          { text: "다른 일을 했습니다", sourceIds: ["project-other"] },
        ],
      },
      {
        load: async () => ({
          ...connectedResume([resumeNode("name", { text: "테스트 사용자" })]),
          sections: {
            ...connectedResume([resumeNode("name", { text: "테스트 사용자" })])
              .sections,
            employmentHistory: [
              resumeNode("employmentHistory", {
                children: [
                  resumeNode("employment", {
                    attributes: { id: "employment-selected" },
                    children: [
                      resumeNode("organization", { text: "선택한 회사" }),
                    ],
                  }),
                ],
              }),
            ],
            projects: [
              resumeNode("projects", {
                children: [
                  resumeNode("project", {
                    attributes: {
                      id: "project-linked",
                      employmentRef: "employment-selected",
                    },
                    references: { employmentRef: ["employment-selected"] },
                    children: [
                      resumeNode("title", { text: "연결된 프로젝트" }),
                    ],
                  }),
                  resumeNode("project", {
                    attributes: {
                      id: "project-other",
                      employmentRef: "employment-other",
                    },
                    references: { employmentRef: ["employment-other"] },
                    children: [
                      resumeNode("title", { text: "분리된 프로젝트" }),
                    ],
                  }),
                ],
              }),
            ],
          },
        }),
      },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const checked = JSON.parse(result.text) as {
      claims: {
        sourceIds: string[];
        sources: { text: string; children: { text: string }[] }[];
      }[];
      gaps: { sourceIds: string[] }[];
    };
    expect(checked.claims.map((claim) => claim.sourceIds)).toEqual([
      ["employment-selected"],
      ["project-linked"],
    ]);
    expect(JSON.stringify(checked.claims)).toContain("선택한 회사");
    expect(JSON.stringify(checked.claims)).toContain("연결된 프로젝트");
    expect(JSON.stringify(checked.claims)).not.toContain("테스트 사용자");
    expect(JSON.stringify(checked.claims)).not.toContain("분리된 프로젝트");
    expect(checked.gaps.map((gap) => gap.sourceIds)).toEqual([
      ["profile-test"],
      ["project-other"],
    ]);
  });

  it("초안 검사의 프로젝트 중심형은 선택한 프로젝트와 그 프로젝트가 가리키는 경력만 근거로 둔다", async () => {
    const result = await callResumeTool(
      "check_resume_draft",
      {
        source: "embedded",
        xml: 'schemaVersion="0.2.0"',
        template: "프로젝트 중심형",
        elementIds: [
          "employment-selected",
          "employment-other",
          "project-linked",
        ],
        sectionOrder: ["projects", "employmentHistory"],
        claims: [
          { text: "다른 회사입니다", sourceIds: ["employment-other"] },
          { text: "연결된 프로젝트입니다", sourceIds: ["project-linked"] },
          { text: "선택한 회사입니다", sourceIds: ["employment-selected"] },
        ],
      },
      {
        load: async () => ({
          ...connectedResume(),
          sections: {
            employmentHistory: [
              resumeNode("employmentHistory", {
                children: [
                  resumeNode("employment", {
                    attributes: { id: "employment-selected" },
                    children: [
                      resumeNode("organization", { text: "선택한 회사" }),
                    ],
                  }),
                  resumeNode("employment", {
                    attributes: { id: "employment-other" },
                    children: [
                      resumeNode("organization", { text: "제외된 회사" }),
                    ],
                  }),
                ],
              }),
            ],
            projects: [
              resumeNode("projects", {
                children: [
                  resumeNode("project", {
                    attributes: {
                      id: "project-linked",
                      employmentRef: "employment-selected",
                    },
                    references: { employmentRef: ["employment-selected"] },
                    children: [
                      resumeNode("title", { text: "연결된 프로젝트" }),
                    ],
                  }),
                ],
              }),
            ],
          },
        }),
      },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const checked = JSON.parse(result.text) as {
      claims: { sourceIds: string[] }[];
      gaps: { sourceIds: string[] }[];
    };
    expect(checked.claims.map((claim) => claim.sourceIds)).toEqual([
      ["project-linked"],
      ["employment-selected"],
    ]);
    expect(checked.gaps.map((gap) => gap.sourceIds)).toEqual([
      ["employment-other"],
    ]);
    expect(result.text).toContain("연결된 프로젝트");
    expect(result.text).toContain("선택한 회사");
    expect(result.text).not.toContain("제외된 회사");
  });

  it("초안 검사의 claims가 배열이 아니면 INVALID_INPUT을 반환한다", async () => {
    const result = await callResumeTool(
      "check_resume_draft",
      {
        source: "embedded",
        xml: 'schemaVersion="0.2.0"',
        template: "기본형",
        elementIds: ["profile-test"],
        sectionOrder: ["profile"],
        claims: "문장",
      },
      connection,
    );

    expect(result).toEqual({ ok: false, code: "INVALID_INPUT" });
  });

  it("초안 검사의 알 수 없는 템플릿은 UNKNOWN_TEMPLATE만 반환한다", async () => {
    const result = await callResumeTool(
      "check_resume_draft",
      {
        source: "embedded",
        xml: 'schemaVersion="0.2.0"',
        template: "없는형",
        elementIds: ["profile-test"],
        sectionOrder: ["profile"],
        claims: [{ text: "소개합니다", sourceIds: ["profile-test"] }],
      },
      connection,
    );

    expect(result).toEqual({ ok: false, code: "UNKNOWN_TEMPLATE" });
  });

  it("이력서 생성은 외부 AI 연결이 다시 쓴 문장 중 검사를 통과한 본문을 반환한다", async () => {
    const requests: { persona: string; prompt: string }[] = [];
    const result = await callResumeTool(
      "generate_resume",
      {
        source: "embedded",
        xml: 'schemaVersion="0.2.0"',
        template: "기본형",
        elementIds: ["profile-test"],
        sectionOrder: ["profile"],
      },
      connection,
      {
        generate: async (input) => {
          requests.push(input);
          if (requests.length === 1) {
            return JSON.stringify({
              elements: [
                { id: "profile-test", interpretation: "이름을 소개한다" },
              ],
            });
          }
          return JSON.stringify({
            claims: [
              { text: "테스트 사용자입니다", sourceIds: ["profile-test"] },
              { text: "없는 성과를 냈습니다", sourceIds: ["missing-id"] },
            ],
          });
        },
      },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const generated = JSON.parse(result.text) as { resume: string };
    expect(requests).toHaveLength(2);
    expect(requests[0]?.persona).toContain("이력서 전문 작성자");
    expect(requests[1]?.prompt).toContain("이름을 소개한다");
    expect(generated.resume).toBe("테스트 사용자입니다");
    expect(generated.resume).not.toContain("없는 성과");
    expect(JSON.stringify(requests)).not.toContain("gemini");
  });

  it("이력서 생성은 양식의 각 섹션마다 외부 AI를 호출한다", async () => {
    const requests: { persona: string; prompt: string }[] = [];
    const responses = [
      JSON.stringify({
        elements: [{ id: "profile-test", interpretation: "이름을 소개한다" }],
      }),
      JSON.stringify({
        claims: [{ text: "테스트 사용자입니다", sourceIds: ["profile-test"] }],
      }),
      JSON.stringify({
        elements: [
          { id: "employment-test", interpretation: "회사에서 일했다" },
        ],
      }),
      JSON.stringify({
        claims: [
          {
            text: "포함되면 안 되는 회사에서 일했습니다",
            sourceIds: ["employment-test"],
          },
        ],
      }),
    ];
    const result = await callResumeTool(
      "generate_resume",
      {
        source: "embedded",
        xml: 'schemaVersion="0.2.0"',
        template: "기본형",
        elementIds: ["profile-test", "employment-test"],
        sectionOrder: ["profile", "employmentHistory"],
      },
      connection,
      {
        generate: async (input) => {
          requests.push(input);
          return responses[requests.length - 1] ?? "";
        },
      },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const generated = JSON.parse(result.text) as { resume: string };
    expect(requests).toHaveLength(4);
    expect(requests[0]?.prompt).toContain("프로필");
    expect(requests[0]?.prompt).toContain("이름 테스트 사용자");
    expect(requests[0]?.prompt).not.toContain("포함되면 안 되는 회사");
    expect(requests[2]?.prompt).toContain("경력");
    expect(requests[2]?.prompt).toContain("회사 포함되면 안 되는 회사");
    expect(requests[2]?.prompt).not.toContain("이름 테스트 사용자");
    expect(generated.resume).toBe(
      "테스트 사용자입니다\n포함되면 안 되는 회사에서 일했습니다",
    );
  });

  it("이력서 생성 안내는 모델 키 없이 같은 역할과 해석 요청을 돌려준다", async () => {
    const result = await callResumeTool(
      "generate_resume",
      {
        source: "embedded",
        xml: 'schemaVersion="0.2.0"',
        template: "기본형",
        elementIds: ["profile-test"],
        sectionOrder: ["profile"],
      },
      connection,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const guide = JSON.parse(result.text) as {
      persona: string;
      step: string;
      prompt: string;
    };
    expect(guide.persona).toContain("이력서 전문 작성자");
    expect(guide.step).toBe("interpret");
    expect(guide.prompt).toContain("해석");
    expect(guide.prompt).toContain("profile-test");
    expect(result.text.toLowerCase()).not.toContain("gemini");
  });

  it("이력서 생성은 해석이 있으면 재작성 요청을 돌려주고 해석이 비면 본문을 만들지 않는다", async () => {
    const base = {
      source: "embedded",
      xml: 'schemaVersion="0.2.0"',
      template: "기본형",
      elementIds: ["profile-test"],
      sectionOrder: ["profile"],
    } as const;
    const rewrite = await callResumeTool(
      "generate_resume",
      {
        ...base,
        interpretation: JSON.stringify({
          elements: [{ id: "profile-test", interpretation: "이름을 소개한다" }],
        }),
      },
      connection,
    );
    const empty = await callResumeTool(
      "generate_resume",
      { ...base, interpretation: JSON.stringify({ elements: [] }) },
      connection,
    );

    expect(rewrite.ok).toBe(true);
    expect(empty.ok).toBe(true);
    if (!rewrite.ok || !empty.ok) return;
    const rewriteBody = JSON.parse(rewrite.text) as {
      step: string;
      prompt: string;
    };
    const emptyBody = JSON.parse(empty.text) as {
      step: string;
      resume: string;
    };
    expect(rewriteBody.step).toBe("rewrite");
    expect(rewriteBody.prompt).toContain("재작성");
    expect(rewriteBody.prompt).toContain("이름을 소개한다");
    expect(emptyBody.step).toBe("done");
    expect(emptyBody.resume).toBe("");
  });

  it("이력서 생성은 어떤 AI가 보낸 문장이든 검사를 통과한 본문만 반환한다", async () => {
    const result = await callResumeTool(
      "generate_resume",
      {
        source: "embedded",
        xml: 'schemaVersion="0.2.0"',
        template: "기본형",
        elementIds: ["profile-test"],
        sectionOrder: ["profile"],
        claims: [
          { text: "테스트 사용자입니다", sourceIds: ["profile-test"] },
          { text: "없는 성과를 냈습니다", sourceIds: ["missing-id"] },
        ],
      },
      connection,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const generated = JSON.parse(result.text) as {
      resume: string;
      step: string;
    };
    expect(generated.step).toBe("done");
    expect(generated.resume).toBe("테스트 사용자입니다");
    expect(generated.resume).not.toContain("없는 성과");
    expect(result.text).toContain("hidden@example.com");
  });
});
