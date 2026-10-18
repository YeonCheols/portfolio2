import { act, fireEvent, render, screen } from "@testing-library/react";

import BlogFeaturedHero from "@/features/blog/ui/BlogFeaturedHero";
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

const item = (id: number, title: string) =>
  ({
    id,
    slug: `post-${id}`,
    date: "2024-06-01T00:00:00.000Z",
    title: { rendered: title },
    excerpt: { rendered: `${title} 요약` },
    total_views_count: 8,
    featured_image_url: `/img-${id}.png`,
  }) as BlogItemProps;

const posts = [item(1, "첫 글"), item(2, "둘째 글"), item(3, "셋째 글")];

describe("BlogFeaturedHero", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it("데이터가 없으면 아무것도 렌더하지 않는다", () => {
    const { container } = render(<BlogFeaturedHero data={[]} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("첫 글의 제목과 링크, 조회수를 보여 준다", () => {
    render(<BlogFeaturedHero data={posts} />);

    expect(screen.getByText("Featured")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "첫 글" })).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute(
      "href",
      "/blog/post-1?id=1",
    );
    expect(screen.getByText("첫 글 요약")).toBeInTheDocument();
    expect(screen.getByText("June 01, 2024")).toBeInTheDocument();
    expect(
      screen.getByText(`${(8).toLocaleString()} Views`),
    ).toBeInTheDocument();
    expect(screen.getAllByAltText("첫 글")[0]).toHaveAttribute(
      "src",
      "/img-1.png",
    );
  });

  it("다음을 누르면 다음 글을 보여 준다", () => {
    render(<BlogFeaturedHero data={posts} />);

    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    expect(
      screen.getByRole("heading", { name: "둘째 글" }),
    ).toBeInTheDocument();
  });

  it("첫 글에서 이전을 누르면 마지막 글을 보여 준다", () => {
    render(<BlogFeaturedHero data={posts} />);

    fireEvent.click(screen.getByRole("button", { name: "Previous" }));

    expect(
      screen.getByRole("heading", { name: "셋째 글" }),
    ).toBeInTheDocument();
  });

  it("썸네일을 누르면 그 글로 바꾼다", () => {
    render(<BlogFeaturedHero data={posts} />);

    fireEvent.click(screen.getAllByRole("button")[4]);

    expect(
      screen.getByRole("heading", { name: "셋째 글" }),
    ).toBeInTheDocument();
  });

  it("5초가 지나면 다음 글로 넘긴다", () => {
    render(<BlogFeaturedHero data={posts} />);

    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(
      screen.getByRole("heading", { name: "둘째 글" }),
    ).toBeInTheDocument();
  });
});
