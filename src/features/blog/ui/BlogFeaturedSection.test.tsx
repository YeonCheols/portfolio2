import { render, screen } from "@testing-library/react";
import useSWR from "swr";

import BlogFeaturedSection from "@/features/blog/ui/BlogFeaturedSection";
import { fetcher } from "@/shared/api/fetcher";

jest.mock("swr", () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock("@/features/blog/ui/BlogFeaturedHero", () => ({
  __esModule: true,
  default: ({ data }: { data: Array<{ title?: { rendered: string } }> }) => (
    <div>{data.length === 0 ? "empty-featured" : data[0]?.title?.rendered}</div>
  ),
}));

jest.mock("@/shared/ui/BlogFeaturedHeroSkeleton", () => {
  const BlogFeaturedHeroSkeleton = () => <div>featured-skeleton</div>;
  return BlogFeaturedHeroSkeleton;
});

const mockedUseSWR = useSWR as jest.Mock;

describe("BlogFeaturedSection", () => {
  it("로딩 중이면 스켈레톤을 보여 준다", () => {
    mockedUseSWR.mockReturnValue({ data: undefined, isLoading: true });

    render(<BlogFeaturedSection />);

    expect(mockedUseSWR).toHaveBeenCalledWith(
      "/api/blog?page=1&per_page=4&categories=11",
      fetcher,
      { revalidateOnFocus: false, refreshInterval: 0 },
    );
    expect(screen.getByText("featured-skeleton")).toBeInTheDocument();
  });

  it("글이 있으면 히어로에 넘긴다", () => {
    mockedUseSWR.mockReturnValue({
      isLoading: false,
      data: {
        status: true,
        data: { posts: [{ title: { rendered: "대표 글" } }] },
      },
    });

    render(<BlogFeaturedSection />);

    expect(screen.getByText("대표 글")).toBeInTheDocument();
  });

  it("상태가 실패하면 빈 히어로를 보여 준다", () => {
    mockedUseSWR.mockReturnValue({
      isLoading: false,
      data: {
        status: false,
        data: { posts: [{ title: { rendered: "숨김" } }] },
      },
    });

    render(<BlogFeaturedSection />);

    expect(screen.getByText("empty-featured")).toBeInTheDocument();
  });
});
