import { render, screen } from "@testing-library/react";

import ProjectPreview from "@/widgets/home/ui/ProjectPreview";

jest.mock("@/widgets/home/ui/ProjectCarousel", () => {
  const ProjectCarousel = () => <div>프로젝트 캐러셀</div>;
  return ProjectCarousel;
});

describe("ProjectPreview", () => {
  it("더보기 링크와 프로젝트 영역을 보여 준다", () => {
    render(<ProjectPreview />);

    expect(
      screen.getByRole("heading", { name: "최신 글" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "더보기" })).toHaveAttribute(
      "href",
      "/projects",
    );
    expect(screen.getByText("프로젝트 캐러셀")).toBeInTheDocument();
  });
});
