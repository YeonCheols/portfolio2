import { render, screen } from "@testing-library/react";

import PageHeading from "@/shared/ui/PageHeading";

describe("PageHeading", () => {
  it("제목과 설명을 넘기면 둘 다 보여 준다", () => {
    render(<PageHeading title="프로젝트" description="설명입니다" />);

    expect(
      screen.getByRole("heading", { level: 1, name: "프로젝트" }),
    ).toBeInTheDocument();
    expect(screen.getByText("설명입니다")).toBeInTheDocument();
  });

  it("설명이 없으면 빈 설명 영역을 보여 준다", () => {
    const { container } = render(<PageHeading title="프로젝트" />);

    expect(
      screen.getByRole("heading", { level: 1, name: "프로젝트" }),
    ).toBeInTheDocument();
    expect(container.querySelector("p")).toBeEmptyDOMElement();
  });
});
