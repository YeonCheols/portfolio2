import { render, screen } from "@testing-library/react";
import useSWR from "swr";

import { ProjectResponse } from "@docs/api";
import ProjectCarousel from "@/widgets/home/ui/ProjectCarousel";

jest.mock("swr", () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock("react-use-draggable-scroll", () => ({
  useDraggable: () => ({ events: {} }),
}));

jest.mock("@/features/projects/ui/ProjectCard", () => {
  const ProjectCard = ({ title }: { title: string }) => (
    <article>{title}</article>
  );
  return ProjectCard;
});

const mockedUseSWR = useSWR as jest.Mock;

const project: ProjectResponse = {
  id: 1,
  title: "포트폴리오",
  slug: "portfolio",
  description: "개인 사이트",
  image: "https://example.com/portfolio.png",
  stacks: "[]",
  content: "",
  isShow: true,
  linkDemo: "",
  linkGithub: "",
  order: 1,
  updatedAt: "2024-01-01T00:00:00.000Z",
};

describe("ProjectCarousel", () => {
  it("프로젝트를 불러오면 제목을 보여 준다", () => {
    mockedUseSWR.mockReturnValue({
      isLoading: false,
      error: undefined,
      data: {
        data: { data: [project, { ...project, id: 2, title: "블로그" }] },
      },
    });

    render(<ProjectCarousel />);

    expect(screen.getByText("포트폴리오")).toBeInTheDocument();
    expect(screen.getByText("블로그")).toBeInTheDocument();
    expect(screen.queryByText("포스트가 없습니다")).not.toBeInTheDocument();
  });

  it("프로젝트가 없으면 빈 상태를 보여 준다", () => {
    mockedUseSWR.mockReturnValue({
      isLoading: false,
      error: undefined,
      data: { data: { data: [] } },
    });

    render(<ProjectCarousel />);

    expect(screen.getByText("포스트가 없습니다")).toBeInTheDocument();
  });

  it("오류가 나면 오류 문구를 보여 준다", () => {
    mockedUseSWR.mockReturnValue({
      isLoading: false,
      error: new Error("fail"),
      data: undefined,
    });

    render(<ProjectCarousel />);

    expect(screen.getByText("오류가 발생했습니다")).toBeInTheDocument();
  });

  it("불러오는 중이면 스켈레톤을 보여 준다", () => {
    mockedUseSWR.mockReturnValue({
      isLoading: true,
      error: undefined,
      data: undefined,
    });

    render(<ProjectCarousel />);

    expect(
      document.querySelectorAll(".react-loading-skeleton").length,
    ).toBeGreaterThan(0);
    expect(screen.queryByText("포스트가 없습니다")).not.toBeInTheDocument();
  });
});
