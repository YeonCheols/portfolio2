import { render, screen } from "@testing-library/react";

import { ProjectResponse } from "@docs/api";
import Projects from "@/features/projects/ui/Projects";

jest.mock("@/features/projects/ui/ProjectCard", () => {
  const ProjectCard = ({ title }: { title: string }) => (
    <article>{title}</article>
  );
  return ProjectCard;
});

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

describe("Projects", () => {
  it("불러오는 중이면 스켈레톤을 보여 준다", () => {
    render(
      <Projects projects={[]} loadMore={jest.fn()} hasMore={false} isLoading />,
    );

    expect(
      document.querySelectorAll(".react-loading-skeleton").length,
    ).toBeGreaterThan(0);
    expect(screen.queryByText("프로젝트가 없습니다")).not.toBeInTheDocument();
  });

  it("프로젝트가 없으면 빈 상태를 보여 준다", () => {
    render(<Projects projects={[]} loadMore={jest.fn()} hasMore={false} />);

    expect(screen.getByText("프로젝트가 없습니다")).toBeInTheDocument();
  });

  it("프로젝트가 있으면 제목을 보여 준다", () => {
    render(
      <Projects
        projects={[project, { ...project, id: 2, title: "블로그" }]}
        loadMore={jest.fn()}
        hasMore={false}
      />,
    );

    expect(screen.getByText("포트폴리오")).toBeInTheDocument();
    expect(screen.getByText("블로그")).toBeInTheDocument();
  });
});
