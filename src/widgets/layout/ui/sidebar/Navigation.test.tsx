import { render, screen } from "@testing-library/react";
import { useRouter } from "next/router";

import Navigation from "@/widgets/layout/ui/sidebar/Navigation";

jest.mock("next/router", () => ({
  useRouter: jest.fn(),
}));

const mockedUseRouter = useRouter as jest.Mock;

describe("Navigation", () => {
  beforeEach(() => {
    mockedUseRouter.mockReturnValue({ pathname: "/" });
  });

  it("노출된 메뉴와 Apps를 보여 준다", () => {
    render(<Navigation />);

    expect(screen.getByRole("link", { name: /Home/ })).toHaveAttribute(
      "href",
      "/",
    );
    expect(screen.getByRole("link", { name: /About/ })).toHaveAttribute(
      "href",
      "/about?activeTab=timeline",
    );
    expect(screen.getByRole("link", { name: /Projects/ })).toHaveAttribute(
      "href",
      "/projects",
    );
    expect(screen.getByRole("link", { name: /Learn/ })).toHaveAttribute(
      "href",
      "/learn",
    );
    expect(screen.getByRole("link", { name: /Guestbook/ })).toHaveAttribute(
      "href",
      "/guestbook",
    );
    expect(screen.getByRole("link", { name: /#Tags/ })).toHaveAttribute(
      "href",
      "/tags",
    );
    expect(screen.getByText("Apps")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /JS Playground/ })).toHaveAttribute(
      "href",
      "/playground",
    );
  });

  it("숨긴 메뉴는 보여 주지 않는다", () => {
    render(<Navigation />);

    expect(
      screen.queryByRole("link", { name: "Dashboard" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Blog" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Contact" }),
    ).not.toBeInTheDocument();
  });
});
