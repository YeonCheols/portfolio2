import { render, screen } from "@testing-library/react";
import { useRouter } from "next/router";

import Menu from "@/widgets/layout/ui/sidebar/Menu";
import { MenuItemProps } from "@/shared/types/menu";

jest.mock("next/router", () => ({
  useRouter: jest.fn(),
}));

const mockedUseRouter = useRouter as jest.Mock;

const item = (title: string, href: string): MenuItemProps => ({
  title,
  href,
  icon: <span>{title} 아이콘</span>,
  isExternal: false,
});

describe("Menu", () => {
  beforeEach(() => {
    mockedUseRouter.mockReturnValue({ pathname: "/" });
  });

  it("제목과 메뉴 항목을 보여 준다", () => {
    render(
      <Menu
        title="페이지"
        list={[item("Home", "/"), item("About", "/about")]}
      />,
    );

    expect(screen.getByText("페이지")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Home/ })).toHaveAttribute(
      "href",
      "/",
    );
    expect(screen.getByRole("link", { name: /About/ })).toHaveAttribute(
      "href",
      "/about",
    );
  });

  it("제목이 없으면 항목만 보여 준다", () => {
    render(<Menu list={[item("Projects", "/projects")]} />);

    expect(screen.queryByText("페이지")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Projects/ })).toBeInTheDocument();
  });
});
