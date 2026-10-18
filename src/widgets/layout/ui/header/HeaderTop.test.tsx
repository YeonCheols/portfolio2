import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRouter } from "next/router";
import { ThemeProvider } from "next-themes";

import HeaderTop from "@/widgets/layout/ui/header/HeaderTop";
import { CommandPaletteContext } from "@/features/cmdpallete/model/CommandPaletteContext";

jest.mock("@yeoncheols/portfolio-core-ui", () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock("next/router", () => ({
  useRouter: jest.fn(),
}));

jest.mock("@/widgets/layout/ui/sidebar/Profile", () => {
  const Profile = () => <div>모바일 프로필</div>;
  return Profile;
});

const mockedUseRouter = useRouter as jest.Mock;

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

const renderHeader = () => {
  const setIsOpen = jest.fn();

  render(
    <ThemeProvider attribute="class">
      <CommandPaletteContext.Provider value={{ isOpen: false, setIsOpen }}>
        <HeaderTop />
      </CommandPaletteContext.Provider>
    </ThemeProvider>,
  );

  return { setIsOpen };
};

describe("HeaderTop", () => {
  beforeEach(() => {
    mockedUseRouter.mockReturnValue({ pathname: "/projects" });
  });

  it("메뉴를 닫으면 이름과 프로필을 보여 준다", () => {
    renderHeader();

    expect(screen.getByRole("link", { name: "성 연 철" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(screen.getByRole("img", { name: "yeon cheol" })).toBeInTheDocument();
    expect(screen.getByText("모바일 프로필")).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Projects" }),
    ).not.toBeInTheDocument();
  });

  it("메뉴를 열면 보이는 메뉴를 보여 주고 이름은 숨긴다", async () => {
    const user = userEvent.setup();
    renderHeader();

    await user.click(screen.getByRole("button"));

    expect(
      screen.queryByRole("link", { name: "성 연 철" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "About" })).toHaveAttribute(
      "href",
      "/about?activeTab=timeline",
    );
    expect(screen.getByRole("link", { name: "Projects" })).toHaveAttribute(
      "href",
      "/projects",
    );
    expect(screen.getByRole("link", { name: "Learn" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Guestbook" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "#Tags" })).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Home" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Blog" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Dashboard" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Contact" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Projects" }).className).toContain(
      "!text-neutral-800",
    );
  });

  it("메뉴를 다시 누르면 닫는다", async () => {
    const user = userEvent.setup();
    renderHeader();

    await user.click(screen.getByRole("button"));
    await user.click(screen.getByRole("button"));

    expect(screen.getByRole("link", { name: "성 연 철" })).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Projects" }),
    ).not.toBeInTheDocument();
  });

  it("커맨드 아이콘을 누르면 팔레트를 연다", async () => {
    const user = userEvent.setup();
    const { setIsOpen } = renderHeader();

    const command = document.querySelector("header svg.cursor-pointer");
    expect(command).not.toBeNull();
    await user.click(command as Element);

    expect(setIsOpen).toHaveBeenCalledWith(true);
  });
});
