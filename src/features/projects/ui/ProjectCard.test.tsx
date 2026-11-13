import { act, render, screen } from "@testing-library/react";

import { ProjectResponse } from "@docs/api";
import ProjectCard from "@/features/projects/ui/ProjectCard";
import { useStacks } from "@/shared/hooks/useStacks";

jest.mock("@yeoncheols/portfolio-core-ui", () => ({
  Tooltip: ({
    children,
    title,
  }: {
    children: React.ReactNode;
    title: string;
  }) => <span title={title}>{children}</span>,
}));

jest.mock("@/shared/hooks/useStacks", () => ({
  useStacks: jest.fn(),
}));

const mockedUseStacks = useStacks as jest.Mock;
const originalResizeObserver = global.ResizeObserver;
let resize: ResizeObserverCallback;
let rowWidth = 240;

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
    rowWidth = 240;
    jest
      .spyOn(HTMLElement.prototype, "getBoundingClientRect")
      .mockImplementation(() => ({
        width: rowWidth,
        height: 20,
        top: 0,
        left: 0,
        right: rowWidth,
        bottom: 20,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }));
    global.ResizeObserver = class {
      constructor(callback: ResizeObserverCallback) {
        resize = callback;
      }
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;
    mockedUseStacks.mockReturnValue({
      StackIcons: {
        React: <span>React 아이콘</span>,
        TypeScript: <span>TS 아이콘</span>,
      },
      stacksData: undefined,
      isStacksLoading: false,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    global.ResizeObserver = originalResizeObserver;
  });

  it("카드 너비에 완전히 들어가는 아이콘만 보여 주고 너비가 늘면 추가한다", () => {
    rowWidth = 52;
    mockedUseStacks.mockReturnValue({
      StackIcons: {
        React: <span>React 아이콘</span>,
        TypeScript: <span>TS 아이콘</span>,
        Next: <span>Next 아이콘</span>,
      },
    });
    render(<ProjectCard {...project} stacks='["React","TypeScript","Next"]' />);
    expect(screen.getByText("React 아이콘")).toBeInTheDocument();
    expect(screen.getByText("TS 아이콘")).toBeInTheDocument();
    expect(screen.queryByText("Next 아이콘")).not.toBeInTheDocument();

    act(() => {
      resize(
        [{ contentRect: { width: 80 } } as ResizeObserverEntry],
        {} as ResizeObserver,
      );
    });
    expect(screen.getByText("Next 아이콘")).toBeInTheDocument();
  });

  it("설명 전체와 각 기술명을 개별 툴팁으로 제공한다", () => {
    const description =
      "프로젝트·프로필·기술 스택을 관리하고 마크다운 본문과 이미지를 편집하는 관리자 대시보드입니다. 별도의 포트폴리오 API와 연동해 콘텐츠 관리 작업을 한곳에 모았습니다.";
    render(<ProjectCard {...project} description={description} />);
    expect(screen.getByTitle(description)).toHaveTextContent(description);
    expect(screen.getByTitle("React")).toContainElement(
      screen.getByText("React 아이콘"),
    );
    expect(screen.getByTitle("TypeScript")).toContainElement(
      screen.getByText("TS 아이콘"),
    );
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
