import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import EducationCard from "@/features/about/ui/EducationCard";
import { EducationProps } from "@/shared/types/education";

jest.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  motion: {
    ul: ({ children }: { children: React.ReactNode }) => <ul>{children}</ul>,
    li: ({ children }: { children: React.ReactNode }) => <li>{children}</li>,
  },
}));

const education: EducationProps = {
  school: "김포대학교",
  major: "네트워크관리학과",
  logo: "",
  location: "경기 김포",
  degree: "전문학사",
  start_year: 2015,
  end_year: 2018,
  link: "https://www.gimpo.ac.kr/",
  highlights: ["네트워크 실습", "서버 관리"],
};

describe("EducationCard", () => {
  it("학교 링크와 학력 정보를 보여 준다", () => {
    render(<EducationCard {...education} />);

    const school = screen.getByRole("link", { name: "김포대학교" });
    expect(school).toHaveAttribute("href", "https://www.gimpo.ac.kr/");
    expect(school).toHaveAttribute("rel", "noopener noreferrer");
    expect(screen.getByText("전문학사")).toBeInTheDocument();
    expect(screen.getByText("네트워크관리학과")).toBeInTheDocument();
    expect(screen.getByText("2015")).toBeInTheDocument();
    expect(screen.getByText("2018")).toBeInTheDocument();
    expect(screen.getByText("경기 김포")).toBeInTheDocument();
    expect(
      screen.queryByRole("img", { name: "김포대학교" }),
    ).not.toBeInTheDocument();
  });

  it("종료 연도가 없으면 Present를 보여 준다", () => {
    render(<EducationCard {...education} end_year={null} />);

    expect(screen.getByText("Present")).toBeInTheDocument();
  });

  it("교육 내용을 누르면 하이라이트를 보여 주고 다시 누르면 숨긴다", async () => {
    const user = userEvent.setup();
    render(<EducationCard {...education} />);

    expect(screen.queryByText("네트워크 실습")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "교육 내용" }));
    expect(screen.getByText("네트워크 실습")).toBeInTheDocument();
    expect(screen.getByText("서버 관리")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "교육 내용" }));
    expect(screen.queryByText("네트워크 실습")).not.toBeInTheDocument();
  });

  it("하이라이트가 없으면 교육 내용 버튼을 보여 주지 않는다", () => {
    render(<EducationCard {...education} highlights={[]} />);

    expect(
      screen.queryByRole("button", { name: "교육 내용" }),
    ).not.toBeInTheDocument();
  });

  it("링크가 없으면 # 주소로 연결한다", () => {
    render(<EducationCard {...education} link="" />);

    const school = screen.getByRole("link", { name: "김포대학교" });
    expect(school).toHaveAttribute("href", "#");
    expect(school).not.toHaveAttribute("rel");
  });

  it("로고가 있으면 학교 이미지를 보여 준다", () => {
    render(<EducationCard {...education} logo="/images/school.png" />);

    expect(screen.getByRole("img", { name: "김포대학교" })).toBeInTheDocument();
  });
});
