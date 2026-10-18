import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRouter } from "next/router";

import { MenuContext } from "@/widgets/layout/model/MenuContext";
import MenuItem from "@/widgets/layout/ui/sidebar/MenuItem";
import { MenuItemProps } from "@/shared/types/menu";

jest.mock("next/router", () => ({
  useRouter: jest.fn(),
}));

const mockedUseRouter = useRouter as jest.Mock;

const renderItem = (
  props: Partial<MenuItemProps> & Pick<MenuItemProps, "title" | "href">,
) => {
  const hideNavbar = jest.fn();
  const onClick = jest.fn();

  render(
    <MenuContext.Provider value={{ hideNavbar }}>
      <MenuItem
        icon={<span>메뉴아이콘</span>}
        isExternal={false}
        onClick={onClick}
        {...props}
      />
    </MenuContext.Provider>,
  );

  return { hideNavbar, onClick };
};

describe("MenuItem", () => {
  beforeEach(() => {
    mockedUseRouter.mockReturnValue({ pathname: "/about" });
  });

  it("내부 링크를 누르면 메뉴를 닫고 onClick을 호출한다", async () => {
    const user = userEvent.setup();
    const { hideNavbar, onClick } = renderItem({
      title: "About",
      href: "/about",
    });

    await user.click(screen.getByRole("link", { name: /About/ }));

    expect(screen.getByRole("link", { name: /About/ })).toHaveAttribute(
      "href",
      "/about",
    );
    expect(hideNavbar).toHaveBeenCalled();
    expect(onClick).toHaveBeenCalled();
  });

  it("해시 링크를 누르면 이동 없이 메뉴를 닫는다", async () => {
    const user = userEvent.setup();
    const { hideNavbar, onClick } = renderItem({ title: "검색", href: "#" });

    expect(screen.queryByRole("link")).not.toBeInTheDocument();

    await user.click(screen.getByText("검색"));

    expect(hideNavbar).toHaveBeenCalledTimes(1);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("외부 링크는 새 탭으로 열고 호버하면 아이콘을 보여 준다", () => {
    const { container } = render(
      <MenuContext.Provider value={{ hideNavbar: jest.fn() }}>
        <MenuItem
          title="GitHub"
          href="https://github.com/YeonCheols"
          icon={<span>메뉴아이콘</span>}
          isExternal
        />
      </MenuContext.Provider>,
    );

    const link = screen.getByRole("link", { name: /GitHub/ });
    expect(link).toHaveAttribute("target", "_blank");
    expect(container.querySelector("svg")).not.toBeInTheDocument();

    fireEvent.mouseEnter(
      screen.getByText("GitHub").parentElement as HTMLElement,
    );

    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("현재 경로와 같으면 활성 아이콘을 보여 준다", () => {
    const { container } = render(
      <MenuContext.Provider value={{ hideNavbar: jest.fn() }}>
        <MenuItem
          title="About"
          href="/about"
          icon={<span>메뉴아이콘</span>}
          isExternal={false}
        />
      </MenuContext.Provider>,
    );

    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("다른 경로면 활성 아이콘을 보여 주지 않는다", () => {
    const { container } = render(
      <MenuContext.Provider value={{ hideNavbar: jest.fn() }}>
        <MenuItem
          title="Projects"
          href="/projects"
          icon={<span>메뉴아이콘</span>}
          isExternal={false}
        />
      </MenuContext.Provider>,
    );

    expect(container.querySelector("svg")).not.toBeInTheDocument();
  });

  it("아이콘을 숨기면 제목만 보여 준다", () => {
    renderItem({ title: "About", href: "/contact", hideIcon: true });

    expect(screen.getByText("About")).toBeInTheDocument();
    expect(screen.queryByText("메뉴아이콘")).not.toBeInTheDocument();
  });

  it("children을 전달하면 함께 보여 준다", () => {
    renderItem({
      title: "About",
      href: "/contact",
      children: <span>배지</span>,
    });

    expect(screen.getByText("배지")).toBeInTheDocument();
  });
});
