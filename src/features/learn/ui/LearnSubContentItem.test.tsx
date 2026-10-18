import { render, screen } from "@testing-library/react";

import LearnSubContentItem from "@/features/learn/ui/LearnSubContentItem";
import { useStacks } from "@/shared/hooks/useStacks";

jest.mock("@yeoncheols/portfolio-core-ui", () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock("@/shared/hooks/useStacks", () => ({
  useStacks: jest.fn(),
}));

const mockedUseStacks = useStacks as jest.Mock;

describe("LearnSubContentItem", () => {
  beforeEach(() => {
    mockedUseStacks.mockReturnValue({
      StackIcons: { TypeScript: <span>TS</span> },
      stacksData: undefined,
      isStacksLoading: false,
    });
  });

  it("하위 콘텐츠 링크와 난이도를 보여 준다", () => {
    render(
      <LearnSubContentItem
        parent="React"
        contentSlug="react"
        subContentSlug="hooks"
        title="훅 기초"
        language="TypeScript"
        difficulty="Easy"
      />,
    );

    expect(screen.getByRole("link")).toHaveAttribute(
      "href",
      "/learn/react/hooks",
    );
    expect(
      screen.getByRole("heading", { name: "훅 기초" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Easy")).toBeInTheDocument();
    expect(screen.getByText("TS")).toBeInTheDocument();
  });

  it("난이도와 언어가 없으면 부가 정보를 보여 주지 않는다", () => {
    render(
      <LearnSubContentItem
        parent="React"
        contentSlug="react"
        subContentSlug="hooks"
        title="훅 기초"
      />,
    );

    expect(
      screen.getByRole("heading", { name: "훅 기초" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Easy")).not.toBeInTheDocument();
    expect(screen.queryByText("TS")).not.toBeInTheDocument();
  });
});
