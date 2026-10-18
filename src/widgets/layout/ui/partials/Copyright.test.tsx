import { render, screen } from "@testing-library/react";

import Copyright from "@/widgets/layout/ui/partials/Copyright";

describe("Copyright", () => {
  it("현재 연도와 aulianza 링크를 보여 준다", () => {
    render(<Copyright />);

    expect(
      screen.getByText(String(new Date().getFullYear())),
    ).toBeInTheDocument();
    expect(screen.getByText("with")).toBeInTheDocument();
    expect(screen.getByText("by")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "aulianza" })).toHaveAttribute(
      "href",
      "http://github.com/aulianza/aulianza.id",
    );
  });
});
