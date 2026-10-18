import { act, render, screen } from "@testing-library/react";

import ContentDetailHeader from "@/features/learn/ui/ContentDetailHeader";
import { useStacks } from "@/shared/hooks/useStacks";
import { SubContentMetaProps } from "@/shared/types/learn";

jest.mock("@yeoncheols/portfolio-core-ui", () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock("@/shared/hooks/useStacks", () => ({
  useStacks: jest.fn(),
}));

const mockedUseStacks = useStacks as jest.Mock;

const meta: SubContentMetaProps = {
  id: 1,
  title: "훅 기초",
  category: "React",
  created_at: "2024-01-01",
  updated_at: "2024-01-02",
  is_playground: false,
  is_comment: false,
  source: "GitHub",
  source_url: "https://github.com/example/repo",
  difficulty: "Easy",
  language: "TypeScript",
};

describe("ContentDetailHeader", () => {
  beforeEach(() => {
    mockedUseStacks.mockReturnValue({
      StackIcons: { TypeScript: <span>TS</span> },
      stacksData: undefined,
      isStacksLoading: false,
    });
  });

  it("제목과 카테고리와 출처와 난이도를 보여 준다", () => {
    render(<ContentDetailHeader {...meta} />);

    expect(
      screen.getByRole("heading", { name: "훅 기초" }),
    ).toBeInTheDocument();
    expect(screen.getByText("# React")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /View in GitHub/ }),
    ).toHaveAttribute("href", "https://github.com/example/repo");
    expect(screen.getByText("Easy")).toBeInTheDocument();
    expect(screen.getByText("TS")).toBeInTheDocument();
  });

  it("출처가 없으면 외부 링크를 보여 주지 않는다", () => {
    render(
      <ContentDetailHeader
        {...meta}
        source={undefined}
        source_url={undefined}
        difficulty={undefined}
        language={undefined}
      />,
    );

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.queryByText("Easy")).not.toBeInTheDocument();
    expect(screen.queryByText("TS")).not.toBeInTheDocument();
    expect(screen.getByText("# React")).toBeInTheDocument();
  });

  it("스크롤이 250을 넘으면 작은 제목으로 보여 준다", () => {
    render(<ContentDetailHeader {...meta} />);

    expect(screen.getByRole("heading", { name: "훅 기초" })).toHaveClass(
      "text-2xl",
    );

    act(() => {
      document.documentElement.scrollTop = 300;
      window.dispatchEvent(new Event("scroll"));
    });

    expect(screen.getByRole("heading", { name: "훅 기초" })).toHaveClass(
      "text-lg",
    );
  });
});
