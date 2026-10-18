import { fireEvent, render, screen } from "@testing-library/react";

import BlogCardNew from "@/features/blog/ui/BlogCardNew";
import { BlogItemProps } from "@/shared/types/blog";

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({
    href,
    children,
  }: {
    href: string;
    children: React.ReactNode;
  }) => <a href={href}>{children}</a>,
}));

jest.mock("next/image", () => ({
  __esModule: true,
  default: ({ alt, src }: { alt: string; src: string }) => (
    <img alt={alt} src={src} />
  ),
}));

jest.mock("framer-motion", () => ({
  motion: {
    div: ({
      children,
      className,
    }: {
      children: React.ReactNode;
      className?: string;
    }) => <div className={className}>{children}</div>,
  },
}));

jest.mock("@yeoncheols/portfolio-core-ui", () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const post = {
  id: 7,
  slug: "hello",
  title: { rendered: "안녕 블로그" },
  featured_image_url: "/cover.png",
  date: "2024-06-01T00:00:00.000Z",
  content: { rendered: "hello world" },
  excerpt: { rendered: "짧은 요약" },
  total_views_count: 12,
  tags_list: [{ term_id: 1, name: "react" }],
} as BlogItemProps;

describe("BlogCardNew", () => {
  it("제목과 태그, 요약, 조회수를 보여 주고 상세로 연결한다", () => {
    render(<BlogCardNew {...post} />);

    expect(screen.getByRole("link")).toHaveAttribute(
      "href",
      "/blog/hello?id=7",
    );
    expect(
      screen.getByRole("heading", { name: "안녕 블로그" }),
    ).toBeInTheDocument();
    expect(screen.getByText("React")).toBeInTheDocument();
    expect(screen.getByText("짧은 요약")).toBeInTheDocument();
    expect(screen.getByText("June 01, 2024")).toBeInTheDocument();
    expect(
      screen.getByText(`${(12).toLocaleString()} VIEWS`),
    ).toBeInTheDocument();
    expect(
      screen.getByText(`${(1).toLocaleString()} MINS READ`),
    ).toBeInTheDocument();
    expect(screen.getByAltText("안녕 블로그")).toHaveAttribute(
      "src",
      "/cover.png",
    );
    expect(screen.getByText("READ MORE").parentElement).toHaveClass("hidden");
  });

  it("이미지가 없으면 자리 표시 이미지를 보여 준다", () => {
    render(<BlogCardNew {...post} featured_image_url="" />);

    expect(screen.getByAltText("안녕 블로그")).toHaveAttribute(
      "src",
      "/images/placeholder.png",
    );
  });

  it("요약을 끄면 요약문을 숨긴다", () => {
    render(<BlogCardNew {...post} isExcerpt={false} />);

    expect(screen.queryByText("짧은 요약")).not.toBeInTheDocument();
  });

  it("마우스를 올리면 READ MORE를 보여 준다", () => {
    render(<BlogCardNew {...post} />);

    fireEvent.mouseEnter(screen.getByRole("link").firstElementChild!);

    expect(screen.getByText("READ MORE").parentElement).not.toHaveClass(
      "hidden",
    );
    expect(
      screen.getByText(`${(12).toLocaleString()} VIEWS`).parentElement
        ?.parentElement,
    ).toHaveClass("hidden");
  });
});
