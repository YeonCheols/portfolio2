import { render, screen } from "@testing-library/react";

import { ProjectResponse } from "@docs/api";
import ProjectCard from "@/features/projects/ui/ProjectCard";
import { useStacks } from "@/shared/hooks/useStacks";

jest.mock("@yeoncheols/portfolio-core-ui", () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock("@/shared/hooks/useStacks", () => ({
  useStacks: jest.fn(),
}));

const mockedUseStacks = useStacks as jest.Mock;

const project: ProjectResponse = {
  id: 1,
  title: "포트폴리오",
  slug: "portfolio",
  description: "개인 사이트",
  image: "https://example.com/portfolio.png",
  stacks: '["React","TypeScript"]',
  content: "",
  isShow: true,
  linkDemo: "https://ycseng.com",
  linkGithub: "https://github.com/YeonCheols",
  order: 1,
  updatedAt: "2024-01-01T00:00:00.000Z",
};

describe("ProjectCard", () => {
  beforeEach(() => {
    mockedUseStacks.mockReturnValue({
      StackIcons: {
        React: <span>React 아이콘</span>,
        TypeScript: <span>TS 아이콘</span>,
      },
      stacksData: undefined,
      isStacksLoading: false,
    });
  });

  it("프로젝트 링크와 설명과 스택을 보여 준다", () => {
    render(<ProjectCard {...project} />);

    expect(screen.getByRole("link")).toHaveAttribute(
      "href",
      "/projects/portfolio",
    );
    expect(screen.getByText("포트폴리오")).toBeInTheDocument();
    expect(screen.getByText("개인 사이트")).toBeInTheDocument();
    expect(screen.getByText("View Project")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "포트폴리오" })).toBeInTheDocument();
    expect(screen.getByText("React 아이콘")).toBeInTheDocument();
    expect(screen.getByText("TS 아이콘")).toBeInTheDocument();
  });

  it("이미지가 https가 아니면 이미지를 보여 주지 않는다", () => {
    render(<ProjectCard {...project} image="/images/local.png" stacks="[]" />);

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.queryByText("React 아이콘")).not.toBeInTheDocument();
    expect(screen.getByText("View Project")).toBeInTheDocument();
  });
});
