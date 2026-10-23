import { composeResume } from "@mcp/resume/compose/composeResume";
import { renderResumeTemplate } from "@mcp/resume/output/renderResumeTemplate";
import { connectedResume, resumeNode } from "@mcp/resume/testing/resumeFixture";

describe("renderResumeTemplate", () => {
  it("원소 이름을 값 옆에 붙이고 원문 띄어쓰기를 유지한다", () => {
    const headline = "5년차프론트엔드";
    const composed = composeResume(
      connectedResume([resumeNode("headline", { text: headline })]),
      { elementIds: ["profile-test"], sectionOrder: ["profile"] },
    );

    const text = renderResumeTemplate(composed, "기본형");

    expect(text.startsWith("기본형")).toBe(true);
    expect(text).toContain(`headline ${headline}`);
    expect(text).not.toContain("포함되면 안 되는 회사");
  });

  it("반복된 같은 원소 이름은 하나의 불릿 목록으로 묶는다", () => {
    const composed = composeResume(
      {
        ...connectedResume(),
        sections: {
          employmentHistory: [
            resumeNode("employmentHistory", {
              children: [
                resumeNode("employment", {
                  attributes: { id: "employment-selected" },
                  children: [
                    resumeNode("organization", { text: "선택한 회사" }),
                    resumeNode("jobCategories", {
                      children: [
                        resumeNode("category", { text: "반응형웹" }),
                        resumeNode("category", { text: "인터페이스" }),
                        resumeNode("category", { text: "GUI" }),
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
                    resumeNode("domains", {
                      children: [
                        resumeNode("domain", { text: "마이페이지" }),
                        resumeNode("domain", { text: "이력서" }),
                      ],
                    }),
                  ],
                }),
              ],
            }),
          ],
        },
      },
      {
        elementIds: ["employment-selected", "project-selected"],
        sectionOrder: ["employmentHistory", "projects"],
      },
    );

    const text = renderResumeTemplate(composed, "기본형");

    expect(text).toContain("organization 선택한 회사");
    expect(text).toContain("category\n- 반응형웹\n- 인터페이스\n- GUI");
    expect(text).toContain("domain\n- 마이페이지\n- 이력서");
    expect(text).not.toContain("category 반응형웹");
    expect(text).not.toContain("domain 마이페이지");
  });

  it("경력 중심형은 선택한 경력과 연결된 프로젝트의 원소만 보여주고 프로필은 빼 준다", () => {
    const composed = composeResume(
      {
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
                  children: [resumeNode("title", { text: "연결된 프로젝트" })],
                }),
                resumeNode("project", {
                  attributes: {
                    id: "project-other",
                    employmentRef: "employment-other",
                  },
                  references: { employmentRef: ["employment-other"] },
                  children: [resumeNode("title", { text: "분리된 프로젝트" })],
                }),
              ],
            }),
          ],
        },
      },
      {
        elementIds: [
          "profile-test",
          "employment-selected",
          "project-linked",
          "project-other",
        ],
        sectionOrder: ["profile", "employmentHistory", "projects"],
      },
    );

    const text = renderResumeTemplate(composed, "경력 중심형");

    expect(text).toContain("organization 선택한 회사");
    expect(text).toContain("title 연결된 프로젝트");
    expect(text).not.toContain("테스트 사용자");
    expect(text).not.toContain("분리된 프로젝트");
  });

  it("프로젝트 중심형은 선택한 프로젝트와 연결된 경력을 그 순서로 보여주고 연결 없는 경력은 빼 준다", () => {
    const composed = composeResume(
      {
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
                  children: [resumeNode("title", { text: "선택한 프로젝트" })],
                }),
              ],
            }),
          ],
        },
      },
      {
        elementIds: [
          "employment-linked",
          "employment-other",
          "project-selected",
        ],
        sectionOrder: ["employmentHistory", "projects"],
      },
    );

    const text = renderResumeTemplate(composed, "프로젝트 중심형");
    const lines = text.split("\n");

    expect(lines[0]).toBe("프로젝트 중심형");
    expect(lines.indexOf("projects")).toBeLessThan(
      lines.indexOf("employmentHistory"),
    );
    expect(text).toContain("title 선택한 프로젝트");
    expect(text).toContain("organization 연결된 회사");
    expect(text).not.toContain("분리된 회사");
  });
});
