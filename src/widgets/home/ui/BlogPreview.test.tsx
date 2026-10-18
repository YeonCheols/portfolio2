import { render, screen } from "@testing-library/react";

import BlogPreview from "@/widgets/home/ui/BlogPreview";

jest.mock("@/widgets/home/ui/BlogCarousel", () => {
  const BlogCarousel = () => <div>블로그 캐러셀</div>;
  return BlogCarousel;
});

describe("BlogPreview", () => {
  it("최신 글 제목과 더보기 링크를 보여 준다", () => {
    render(<BlogPreview />);

    expect(
      screen.getByRole("heading", { name: "최신 글" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /더보기/ })).toHaveAttribute(
      "href",
      "/blog",
    );
    expect(screen.getByText("블로그 캐러셀")).toBeInTheDocument();
  });
});
