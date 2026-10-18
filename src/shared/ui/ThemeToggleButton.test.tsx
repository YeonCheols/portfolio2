import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useTheme } from "next-themes";

import ThemeToggleButton from "@/shared/ui/ThemeToggleButton";

jest.mock("next-themes", () => ({
  useTheme: jest.fn(),
}));

const mockedUseTheme = useTheme as jest.Mock;

const themeLabel = () =>
  document.querySelector("label[for='switch-theme']") as HTMLLabelElement;

describe("ThemeToggleButton", () => {
  const setTheme = jest.fn();

  beforeEach(() => {
    setTheme.mockReset();
  });

  it("라이트 테마에서 바꾸면 다크 테마로 설정한다", async () => {
    const user = userEvent.setup();
    mockedUseTheme.mockReturnValue({ resolvedTheme: "light", setTheme });
    render(<ThemeToggleButton />);

    const checkbox = screen.getByRole("checkbox", { hidden: true });
    expect(checkbox).not.toBeChecked();
    expect(checkbox).toHaveAttribute("data-umami-event", "Switch to Dark Mode");

    await user.click(themeLabel());

    expect(setTheme).toHaveBeenCalledWith("dark");
  });

  it("다크 테마에서 바꾸면 라이트 테마로 설정한다", async () => {
    const user = userEvent.setup();
    mockedUseTheme.mockReturnValue({ resolvedTheme: "dark", setTheme });
    render(<ThemeToggleButton />);

    const checkbox = screen.getByRole("checkbox", { hidden: true });
    expect(checkbox).toBeChecked();
    expect(checkbox).toHaveAttribute(
      "data-umami-event",
      "Switch to Light Mode",
    );

    await user.click(themeLabel());

    expect(setTheme).toHaveBeenCalledWith("light");
  });
});
