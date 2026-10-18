import { render, screen } from "@testing-library/react";

import Footer from "@/widgets/layout/ui/partials/Footer";

describe("Footer", () => {
  it("현재 연도와 Next.js 문구를 보여 준다", () => {
    render(<Footer />);

    expect(
      screen.getByText(`© ${new Date().getFullYear()}`),
    ).toBeInTheDocument();
    expect(screen.getByText("Built with Next.js")).toBeInTheDocument();
  });
});
