import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useTheme } from "next-themes";
import React from "react";

import ThemeSwitcher from "@/shared/ui/ThemeSwitcher";

jest.mock("next-themes", () => ({
  useTheme: jest.fn(),
}));

const mockedUseTheme = useTheme as jest.Mock;

describe("ThemeSwitcher", () => {
  const setTheme = jest.fn();

  beforeEach(() => {
    setTheme.mockReset();
  });

  it("마운트 전에는 테마 선택을 보여 주지 않는다", () => {
    mockedUseTheme.mockReturnValue({ resolvedTheme: "light", setTheme });
    const effect = jest
      .spyOn(React, "useEffect")
      .mockImplementation(() => undefined);
    const { container } = render(<ThemeSwitcher />);

    expect(container).toBeEmptyDOMElement();
    effect.mockRestore();
  });

  it("라이트 테마이면 다크 모드로 바꾼다", async () => {
    const user = userEvent.setup();
    mockedUseTheme.mockReturnValue({ resolvedTheme: "light", setTheme });
    render(<ThemeSwitcher />);

    await user.click(screen.getByRole("button", { name: "Light Mode" }));
    await user.click(screen.getByRole("option", { name: "Dark Mode" }));

    expect(setTheme).toHaveBeenCalledWith("dark");
  });

  it("다크 테마이면 라이트 모드로 바꾼다", async () => {
    const user = userEvent.setup();
    mockedUseTheme.mockReturnValue({ resolvedTheme: "dark", setTheme });
    render(<ThemeSwitcher />);

    expect(
      screen.getByRole("button", { name: "Dark Mode" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Dark Mode" }));
    await user.click(screen.getByRole("option", { name: "Light Mode" }));

    expect(setTheme).toHaveBeenCalledWith("light");
  });
});
