import {
  isResumeTemplate,
  resumeTemplateNames,
} from "@mcp/resume/model/resumeTemplate";

describe("resumeTemplate", () => {
  it("기본형과 경력 중심형과 프로젝트 중심형만 템플릿으로 인정한다", () => {
    expect(resumeTemplateNames).toEqual([
      "기본형",
      "경력 중심형",
      "프로젝트 중심형",
    ]);
    resumeTemplateNames.forEach((name) => {
      expect(isResumeTemplate(name)).toBe(true);
    });
    expect(isResumeTemplate("없는형")).toBe(false);
  });
});
