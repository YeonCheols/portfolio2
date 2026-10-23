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

    const text = renderResumeTemplate(composed, "경력 중심형");

    expect(text.startsWith("경력 중심형")).toBe(true);
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
});
