import { render, screen } from "@testing-library/react";

import SectionHeading from "@/shared/ui/SectionHeading";

describe("SectionHeading", () => {
  it("제목을 넘기면 제목을 보여 준다", () => {
    render(<SectionHeading title="블로그" />);

    expect(
      screen.getByRole("heading", { level: 2, name: "블로그" }),
    ).toBeInTheDocument();
  });

  it("아이콘을 넘기면 아이콘과 제목을 보여 준다", () => {
    render(<SectionHeading title="블로그" icon={<span>아이콘</span>} />);

    expect(screen.getByText("아이콘")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "블로그" }),
    ).toBeInTheDocument();
  });
});
