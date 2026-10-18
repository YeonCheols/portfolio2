import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useTheme } from "next-themes";

import useHasMounted from "@/shared/hooks/useHasMounted";
import ToggleMode from "@/shared/ui/ToggleMode";

jest.mock("next-themes", () => ({
  useTheme: jest.fn(),
}));

jest.mock("@/shared/hooks/useHasMounted", () => ({
  __esModule: true,
  default: jest.fn(() => true),
}));

const mockedUseTheme = useTheme as jest.Mock;
const mockedUseHasMounted = useHasMounted as jest.Mock;

describe("ToggleMode", () => {
  const setTheme = jest.fn();

  beforeEach(() => {
    setTheme.mockReset();
    mockedUseHasMounted.mockReturnValue(true);
  });

  it("라이트 테마이면 다크 모드로 바꾼다", async () => {
    const user = userEvent.setup();
    mockedUseTheme.mockReturnValue({ resolvedTheme: "light", setTheme });
    render(<ToggleMode />);

    await user.click(screen.getByRole("button", { name: "Dark Mode" }));

    expect(setTheme).toHaveBeenCalledWith("dark");
  });

  it("다크 테마이면 라이트 모드로 바꾼다", async () => {
    const user = userEvent.setup();
    mockedUseTheme.mockReturnValue({ resolvedTheme: "dark", setTheme });
    render(<ToggleMode />);

    await user.click(screen.getByRole("button", { name: "Light Mode" }));

    expect(setTheme).toHaveBeenCalledWith("light");
  });

  it("시스템 테마이면 라이트 모드로 바꾼다", async () => {
    const user = userEvent.setup();
    mockedUseTheme.mockReturnValue({ resolvedTheme: "system", setTheme });
    render(<ToggleMode />);

    await user.click(screen.getByRole("button", { name: "Light Mode" }));

    expect(setTheme).toHaveBeenCalledWith("light");
  });

  it("마운트 전에는 다크 모드 문구를 보여 준다", () => {
    mockedUseHasMounted.mockReturnValue(false);
    mockedUseTheme.mockReturnValue({ resolvedTheme: "dark", setTheme });
    render(<ToggleMode />);

    expect(
      screen.getByRole("button", { name: "Dark Mode" }),
    ).toBeInTheDocument();
  });
});
