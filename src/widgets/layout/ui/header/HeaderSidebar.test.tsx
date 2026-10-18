import { render, screen } from "@testing-library/react";

import HeaderSidebar from "@/widgets/layout/ui/header/HeaderSidebar";

jest.mock("@/widgets/layout/ui/partials/Sidebar", () => {
  const Sidebar = () => <nav>사이드바</nav>;
  return Sidebar;
});

describe("HeaderSidebar", () => {
  it("사이드바를 header 안에 렌더한다", () => {
    render(<HeaderSidebar />);

    expect(screen.getByRole("banner")).toContainElement(
      screen.getByText("사이드바"),
    );
  });
});
