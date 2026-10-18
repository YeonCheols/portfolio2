import { render, screen } from "@testing-library/react";

import MobileMenu from "@/widgets/layout/ui/sidebar/MobileMenu";

jest.mock("@/widgets/layout/ui/sidebar/Navigation", () => {
  const Navigation = () => <nav>내비게이션</nav>;
  return Navigation;
});

describe("MobileMenu", () => {
  it("내비게이션을 보여 준다", () => {
    render(<MobileMenu />);

    expect(screen.getByText("내비게이션")).toBeInTheDocument();
  });
});
