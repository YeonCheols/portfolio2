import { render, screen } from "@testing-library/react";

import Skills from "@/features/about/ui/Skills";
import { useStacks } from "@/shared/hooks/useStacks";

jest.mock("@yeoncheols/portfolio-core-ui", () => ({
  StackIcon: () => <span />,
}));

jest.mock("@/shared/hooks/useStacks", () => ({
  useStacks: jest.fn(),
}));

const mockedUseStacks = useStacks as jest.Mock;

describe("Skills", () => {
  it("스택을 불러오면 기술 이름을 보여 준다", () => {
    mockedUseStacks.mockReturnValue({
      isStacksLoading: false,
      stacksData: {
        data: [
          { id: 1, name: "React", icon: "react", color: "#61dafb" },
          { id: 2, name: "TypeScript", icon: "typescript", color: "#3178c6" },
        ],
      },
      StackIcons: {},
    });

    render(<Skills />);

    expect(screen.getAllByText("React")).toHaveLength(3);
    expect(screen.getAllByText("TypeScript")).toHaveLength(3);
  });

  it("스택을 불러오는 중이면 스켈레톤을 보여 준다", () => {
    mockedUseStacks.mockReturnValue({
      isStacksLoading: true,
      stacksData: undefined,
      StackIcons: {},
    });

    render(<Skills />);

    expect(
      document.querySelector(".react-loading-skeleton"),
    ).toBeInTheDocument();
    expect(screen.queryByText("React")).not.toBeInTheDocument();
  });

  it("스택이 없으면 기술 이름을 보여 주지 않는다", () => {
    mockedUseStacks.mockReturnValue({
      isStacksLoading: false,
      stacksData: { data: [] },
      StackIcons: {},
    });

    const { container } = render(<Skills />);

    expect(container).not.toHaveTextContent("React");
    expect(
      document.querySelector(".react-loading-skeleton"),
    ).not.toBeInTheDocument();
  });
});
