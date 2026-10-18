import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { MenuItemProps } from "@/shared/types/menu";
import SocialMedia from "@/shared/ui/SocialMedia";

jest.mock("@yeoncheols/portfolio-core-ui", () => {
  const React = require("react") as typeof import("react");

  return {
    Tooltip: ({
      title,
      children,
    }: {
      title: string;
      children: React.ReactNode;
    }) => {
      const [open, setOpen] = React.useState(false);

      return (
        <div>
          <div
            onMouseEnter={() => setOpen(true)}
            onMouseLeave={() => setOpen(false)}
          >
            {children}
          </div>
          {open ? <div>{title}</div> : null}
        </div>
      );
    },
  };
});

jest.mock("@yeoncheols/portfolio-core-ui", () => {
  const React = require("react");

  return {
    Tooltip: ({
      children,
      title,
    }: {
      children: React.ReactNode;
      title?: string;
    }) => {
      const [open, setOpen] = React.useState(false);

      return (
        <span
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
        >
          {children}
          {open ? <span>{title}</span> : null}
        </span>
      );
    },
  };
});

const item: MenuItemProps = {
  title: "GitHub",
  href: "https://github.com/example",
  icon: <span>깃</span>,
  isExternal: true,
  eventName: "click-github",
};

describe("SocialMedia", () => {
  it("항목이 없으면 연결 문구만 보여 준다", () => {
    render(<SocialMedia items={[]} />);

    expect(screen.getByText("Lets Connect")).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("항목을 넘기면 링크를 보여 준다", () => {
    render(<SocialMedia items={[item]} />);

    const link = screen.getByRole("link", { name: "깃" });
    expect(link).toHaveAttribute("href", "https://github.com/example");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("data-umami-event", "click-github");
  });

  it("아이콘에 올리면 제목을 보여 준다", async () => {
    const user = userEvent.setup();
    render(<SocialMedia items={[item]} />);

    expect(screen.queryByText("GitHub")).not.toBeInTheDocument();
    await user.hover(screen.getByText("깃"));

    expect(screen.getByText("GitHub")).toBeInTheDocument();
  });
});
