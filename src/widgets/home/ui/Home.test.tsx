import { render, screen } from "@testing-library/react";

import Home from "@/widgets/home/ui/Home";

jest.mock("@/widgets/home/ui/ProjectPreview", () => {
  const ProjectPreview = () => <section>프로젝트 미리보기</section>;
  return ProjectPreview;
});
jest.mock("@/widgets/home/ui/SkillsSection", () => {
  const SkillsSection = () => <section>기술 스택 영역</section>;
  return SkillsSection;
});

describe("Home", () => {
  it("소개와 프로젝트와 기술과 서비스를 함께 보여 준다", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", {
        name: "안녕하세요, 프론트엔드 개발자 성연철입니다",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("프로젝트 미리보기")).toBeInTheDocument();
    expect(screen.getByText("기술 스택 영역")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "서비스" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "문의하기" }),
    ).toBeInTheDocument();
  });
});
