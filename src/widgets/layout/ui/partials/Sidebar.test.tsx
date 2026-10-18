import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "next-themes";

import Sidebar from "@/widgets/layout/ui/partials/Sidebar";
import { CommandPaletteContext } from "@/features/cmdpallete/model/CommandPaletteContext";
import useIsMobile from "@/shared/hooks/useIsMobile";

jest.mock("@/shared/hooks/useIsMobile", () => jest.fn());
jest.mock("@/widgets/layout/ui/sidebar/Profile", () => {
  const Profile = ({ isScrolled }: { isScrolled?: boolean }) => (
    <div>{isScrolled ? "스크롤됨" : "최상단"}</div>
  );
  return Profile;
});
jest.mock("@/widgets/layout/ui/sidebar/Navigation", () => {
  const Navigation = () => <nav>내비게이션</nav>;
  return Navigation;
});

const mockedUseIsMobile = useIsMobile as jest.Mock;

beforeAll(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: jest.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    })),
  });
});

const renderSidebar = () => {
  const setIsOpen = jest.fn();

  render(
    <ThemeProvider attribute="class">
      <CommandPaletteContext.Provider value={{ isOpen: false, setIsOpen }}>
        <Sidebar />
      </CommandPaletteContext.Provider>
    </ThemeProvider>,
  );

  return { setIsOpen };
};

describe("Sidebar", () => {
  it("데스크톱이면 검색과 메뉴와 테마를 보여 준다", async () => {
    mockedUseIsMobile.mockReturnValue(false);
    renderSidebar();

    expect(screen.getByText("최상단")).toBeInTheDocument();
    expect(screen.getByText("Search")).toBeInTheDocument();
    expect(screen.getByText("내비게이션")).toBeInTheDocument();
    expect(screen.getByText("Theme")).toBeInTheDocument();
    expect(await screen.findByText(/Mode/)).toBeInTheDocument();
  });

  it("검색을 누르면 커맨드 팔레트를 연다", async () => {
    const user = userEvent.setup();
    mockedUseIsMobile.mockReturnValue(false);
    const { setIsOpen } = renderSidebar();

    await user.click(screen.getByText("Search"));

    expect(setIsOpen).toHaveBeenCalledWith(true);
  });

  it("스크롤하면 프로필에 스크롤 상태를 전달한다", () => {
    mockedUseIsMobile.mockReturnValue(false);
    renderSidebar();

    act(() => {
      document.documentElement.scrollTop = 20;
      window.dispatchEvent(new Event("scroll"));
    });

    expect(screen.getByText("스크롤됨")).toBeInTheDocument();
  });

  it("모바일이면 검색과 테마를 보여 주지 않는다", () => {
    mockedUseIsMobile.mockReturnValue(true);
    renderSidebar();

    expect(screen.getByText("최상단")).toBeInTheDocument();
    expect(screen.queryByText("Search")).not.toBeInTheDocument();
    expect(screen.queryByText("내비게이션")).not.toBeInTheDocument();
    expect(screen.queryByText("Theme")).not.toBeInTheDocument();
  });
});
