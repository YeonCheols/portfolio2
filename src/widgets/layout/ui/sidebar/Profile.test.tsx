import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRouter } from "next/router";
import { ThemeProvider } from "next-themes";

import Profile from "@/widgets/layout/ui/sidebar/Profile";
import { CommandPaletteContext } from "@/features/cmdpallete/model/CommandPaletteContext";
import useIsMobile from "@/shared/hooks/useIsMobile";

jest.mock("@/shared/hooks/useIsMobile", () => jest.fn());
jest.mock("next/router", () => ({
  useRouter: jest.fn(),
}));
jest.mock("@/widgets/layout/ui/sidebar/ProfileHeader", () => {
  const ProfileHeader = () => <div>프로필 헤더</div>;
  return ProfileHeader;
});
jest.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  motion: {
    div: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  },
}));

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
const mockedUseRouter = useRouter as jest.Mock;

const renderProfile = () => {
  const setIsOpen = jest.fn();

  render(
    <ThemeProvider attribute="class">
      <CommandPaletteContext.Provider value={{ isOpen: false, setIsOpen }}>
        <Profile />
      </CommandPaletteContext.Provider>
    </ThemeProvider>,
  );

  return { setIsOpen };
};

const openMenu = async (user: ReturnType<typeof userEvent.setup>) => {
  const bars = document.querySelectorAll("span");
  await user.click(bars[0].parentElement as HTMLElement);
};

describe("Profile", () => {
  beforeEach(() => {
    mockedUseRouter.mockReturnValue({ pathname: "/" });
    document.body.style.overflow = "";
  });

  it("모바일이 아니면 헤더만 보여 준다", () => {
    mockedUseIsMobile.mockReturnValue(false);
    renderProfile();

    expect(screen.getByText("프로필 헤더")).toBeInTheDocument();
    expect(screen.queryByText("Search")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /Home/ }),
    ).not.toBeInTheDocument();
  });

  it("모바일에서 메뉴를 열면 검색과 메뉴를 보여 주고 스크롤을 막는다", async () => {
    const user = userEvent.setup();
    mockedUseIsMobile.mockReturnValue(true);
    renderProfile();

    await openMenu(user);

    expect(screen.getByText("Search")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Home/ })).toBeInTheDocument();
    expect(document.body.style.overflow).toBe("hidden");
  });

  it("메뉴 링크를 누르면 메뉴를 닫고 스크롤을 되돌린다", async () => {
    const user = userEvent.setup();
    mockedUseIsMobile.mockReturnValue(true);
    renderProfile();

    await openMenu(user);
    await user.click(screen.getByRole("link", { name: /Home/ }));

    expect(screen.queryByText("Search")).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe("auto");
  });

  it("검색을 누르면 커맨드 팔레트를 연다", async () => {
    const user = userEvent.setup();
    mockedUseIsMobile.mockReturnValue(true);
    const { setIsOpen } = renderProfile();

    await openMenu(user);
    await user.click(screen.getByText("Search"));

    expect(setIsOpen).toHaveBeenCalledWith(true);
  });
});
