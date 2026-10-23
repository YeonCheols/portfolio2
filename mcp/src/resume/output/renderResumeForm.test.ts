import { composeResume } from "@mcp/resume/compose/composeResume";
import { renderResumeForm } from "@mcp/resume/output/renderResumeForm";
import { connectedResume, resumeNode } from "@mcp/resume/testing/resumeFixture";

describe("renderResumeForm", () => {
  it("기간은 시작과 종료를 한 줄로 잇고 비어 있는 값은 빼 준다", () => {
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
                    resumeNode("period", {
                      children: [
                        resumeNode("start", { text: "2022-10" }),
                        resumeNode("end", { text: "" }),
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
        elementIds: ["employment-selected"],
        sectionOrder: ["employmentHistory"],
      },
    );

    expect(renderResumeForm(composed, "기본형")).toContain("기간 2022-10");
    expect(renderResumeForm(composed, "기본형")).not.toContain("~");
  });

  it("반복된 같은 항목명은 하나의 불릿 목록으로 묶는다", () => {
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

    const text = renderResumeForm(composed, "기본형");

    expect(text).toContain("회사 선택한 회사");
    expect(text).toContain("직무\n- 반응형웹\n- 인터페이스\n- GUI");
    expect(text).toContain("담당 영역\n- 마이페이지\n- 이력서");
    expect(text).not.toContain("직무 반응형웹");
    expect(text).not.toContain("담당 영역 마이페이지");
  });
});
