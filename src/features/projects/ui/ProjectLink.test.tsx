import { render, screen } from "@testing-library/react";

import ProjectLink from "@/features/projects/ui/ProjectLink";

describe("ProjectLink", () => {
  it("깃허브와 데모 링크를 보여 준다", () => {
    render(
      <ProjectLink
        title="포트폴리오"
        link_github="https://github.com/YeonCheols"
        link_demo="https://ycseng.com"
      />,
    );

    expect(screen.getByRole("link", { name: /Source Code/ })).toHaveAttribute(
      "href",
      "https://github.com/YeonCheols",
    );
    expect(screen.getByRole("link", { name: /Live Demo/ })).toHaveAttribute(
      "href",
      "https://ycseng.com",
    );
    expect(screen.getByText("|")).toBeInTheDocument();
  });

  it("깃허브 링크만 있으면 소스 코드만 보여 준다", () => {
    render(
      <ProjectLink
        title="포트폴리오"
        link_github="https://github.com/YeonCheols"
      />,
    );

    expect(
      screen.getByRole("link", { name: /Source Code/ }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /Live Demo/ }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("|")).not.toBeInTheDocument();
  });

  it("데모 링크만 있으면 라이브 데모만 보여 준다", () => {
    render(<ProjectLink title="포트폴리오" link_demo="https://ycseng.com" />);

    expect(screen.getByRole("link", { name: /Live Demo/ })).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /Source Code/ }),
    ).not.toBeInTheDocument();
  });

  it("링크가 없으면 링크를 보여 주지 않는다", () => {
    render(<ProjectLink title="포트폴리오" />);

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
