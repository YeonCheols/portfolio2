import { fireEvent, render, screen } from "@testing-library/react";

import BlogHeader from "@/features/blog/ui/BlogHeader";

jest.mock("framer-motion", () => ({
  motion: {
    h1: ({
      children,
      className,
    }: {
      children: React.ReactNode;
      className?: string;
    }) => <h1 className={className}>{children}</h1>,
    div: ({
      children,
      className,
    }: {
      children: React.ReactNode;
      className?: string;
    }) => <div className={className}>{children}</div>,
  },
}));

describe("BlogHeader", () => {
  it("제목과 날짜, 조회수, 읽기 시간을 보여 준다", () => {
    render(
      <BlogHeader
        title="헤더 제목"
        published_at="2024-06-01T00:00:00.000Z"
        page_views_count={12}
        reading_time_minutes={4}
      />,
    );

    expect(screen.getByRole("heading", { name: "헤더 제목" })).toHaveClass(
      "text-2xl",
    );
    expect(screen.getByText("June 01, 2024")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("Views")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("Minutes Read")).toBeInTheDocument();
  });

  it("조회수가 없으면 대시를 보여 준다", () => {
    render(
      <BlogHeader
        title="헤더 제목"
        page_views_count={null}
        reading_time_minutes={1}
      />,
    );

    expect(screen.getByText("-")).toBeInTheDocument();
    expect(screen.getByText(/Published on/)).toBeInTheDocument();
  });

  it("250px보다 많이 스크롤하면 작은 제목을 보여 준다", () => {
    render(
      <BlogHeader title="헤더 제목" published_at="2024-06-01T00:00:00.000Z" />,
    );

    Object.defineProperty(window, "pageYOffset", {
      configurable: true,
      value: 251,
    });
    fireEvent.scroll(window);

    expect(screen.getByRole("heading", { name: "헤더 제목" })).toHaveClass(
      "text-lg",
    );
  });
});
