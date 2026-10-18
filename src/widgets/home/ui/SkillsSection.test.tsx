import { render, screen } from "@testing-library/react";

import SkillsSection from "@/widgets/home/ui/SkillsSection";

jest.mock("@/features/about/ui/Skills", () => {
  const Skills = () => <div>기술 목록</div>;
  return Skills;
});

describe("SkillsSection", () => {
  it("기술 스택 제목과 목록을 보여 준다", () => {
    render(<SkillsSection />);

    expect(screen.getByText("기술 스택")).toBeInTheDocument();
    expect(screen.getByText("기술 목록")).toBeInTheDocument();
  });
});
