import { render, screen } from "@testing-library/react";
import { useTheme } from "next-themes";

import GiscusComment from "@/features/blog/ui/GiscusComment";

jest.mock("@giscus/react", () => ({
  __esModule: true,
  default: ({
    theme,
    reactionsEnabled,
    repo,
  }: {
    theme: string;
    reactionsEnabled: string;
    repo: string;
  }) => (
    <div
      data-testid="giscus"
      data-theme={theme}
      data-reactions={reactionsEnabled}
      data-repo={repo}
    />
  ),
}));

jest.mock("next-themes", () => ({
  useTheme: jest.fn(),
}));

const mockedUseTheme = useTheme as jest.Mock;

describe("GiscusComment", () => {
  it("다크 테마이면 어두운 댓글창을 보여주고 반응은 끈다", () => {
    mockedUseTheme.mockReturnValue({ theme: "dark" });

    render(<GiscusComment />);

    const giscus = screen.getByTestId("giscus");
    expect(giscus).toHaveAttribute("data-repo", "aulianza/aulianza.id");
    expect(giscus).toHaveAttribute("data-theme", "transparent_dark");
    expect(giscus).toHaveAttribute("data-reactions", "0");
  });

  it("라이트 테마에서 반응을 켜면 밝은 댓글창을 보여 준다", () => {
    mockedUseTheme.mockReturnValue({ theme: "light" });

    render(<GiscusComment isEnableReaction />);

    const giscus = screen.getByTestId("giscus");
    expect(giscus).toHaveAttribute("data-theme", "light");
    expect(giscus).toHaveAttribute("data-reactions", "1");
  });
});
