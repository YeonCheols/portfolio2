import { act, fireEvent, render, screen } from "@testing-library/react";
import { useRouter } from "next/router";
import useSWR from "swr";

import BlogListNew from "@/features/blog/ui/BlogListNew";
import { fetcher } from "@/shared/api/fetcher";

jest.mock("next/router", () => ({
  useRouter: jest.fn(),
}));

jest.mock("swr", () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock("framer-motion", () => ({
  motion: {
    div: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  },
}));

jest.mock("@/features/blog/ui/BlogFeaturedSection", () => {
  const BlogFeaturedSection = () => <div>featured-section</div>;
  return BlogFeaturedSection;
});

jest.mock("@/features/blog/ui/BlogCardNew", () => ({
  __esModule: true,
  default: ({ title }: { title: { rendered: string } }) => (
    <article>{title.rendered}</article>
  ),
}));

jest.mock("@/shared/ui/BlogCardNewSkeleton", () => {
  const BlogCardNewSkeleton = () => <div>card-skeleton</div>;
  return BlogCardNewSkeleton;
});

const mockedUseRouter = useRouter as jest.Mock;
const mockedUseSWR = useSWR as jest.Mock;
const push = jest.fn();
const mutate = jest.fn().mockResolvedValue(undefined);

const readyList = {
  status: true,
  data: {
    posts: [{ id: 1, title: { rendered: "새 글" } }],
    total_pages: 4,
    total_posts: 42,
  },
};

describe("BlogListNew", () => {
  beforeEach(() => {
    push.mockReset();
    mutate.mockClear();
    mockedUseRouter.mockReturnValue({ push, query: {} });
    mockedUseSWR.mockReturnValue({
      data: readyList,
      error: undefined,
      isValidating: false,
      mutate,
    });
  });

  it("글 목록과 개수를 보여 준다", () => {
    render(<BlogListNew />);

    expect(screen.getByText("featured-section")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Latest Articles" }),
    ).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("새 글")).toBeInTheDocument();
    expect(mockedUseSWR).toHaveBeenCalledWith(
      "/api/blog?page=1&per_page=6&search=",
      fetcher,
      { revalidateOnFocus: false, refreshInterval: 0 },
    );
  });

  it("검증 중이면 스켈레톤을 보여 준다", () => {
    mockedUseSWR.mockReturnValue({
      data: undefined,
      isValidating: true,
      mutate,
    });

    render(<BlogListNew />);

    expect(screen.getAllByText("card-skeleton")).toHaveLength(3);
    expect(screen.queryByText("No Post Found.")).not.toBeInTheDocument();
  });

  it("글이 없으면 빈 상태를 보여 준다", () => {
    mockedUseSWR.mockReturnValue({
      data: {
        status: true,
        data: { posts: [], total_pages: 1, total_posts: 0 },
      },
      isValidating: false,
      mutate,
    });

    render(<BlogListNew />);

    expect(screen.getByText("No Post Found.")).toBeInTheDocument();
  });

  it("불러오기에 실패하면 에러 문구를 보여 준다", () => {
    mockedUseSWR.mockReturnValue({
      data: undefined,
      error: new Error("down"),
      isValidating: false,
      mutate,
    });

    render(<BlogListNew />);

    expect(screen.getByText("Error loading posts")).toBeInTheDocument();
  });

  it("쿼리 페이지가 있으면 그 페이지로 목록을 요청한다", () => {
    mockedUseRouter.mockReturnValue({ push, query: { page: "2" } });

    render(<BlogListNew />);

    expect(mockedUseSWR).toHaveBeenLastCalledWith(
      "/api/blog?page=2&per_page=6&search=",
      fetcher,
      { revalidateOnFocus: false, refreshInterval: 0 },
    );
  });

  it("페이지를 바꾸면 주소를 갱신한다", async () => {
    mockedUseRouter.mockReturnValue({ push, query: { page: "2" } });
    render(<BlogListNew />);

    fireEvent.click(screen.getByRole("button", { name: "3" }));
    await act(async () => {
      await Promise.resolve();
    });

    expect(mutate).toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith(
      { pathname: "/blog", query: { page: 3, search: "" } },
      undefined,
      { shallow: true },
    );
  });

  it("검색어를 입력하면 쿼리를 바꾸고 디바운스 뒤에 다시 요청한다", () => {
    jest.useFakeTimers();
    render(<BlogListNew />);

    fireEvent.change(screen.getByPlaceholderText("Search..."), {
      target: { value: "react" },
    });

    expect(push).toHaveBeenCalledWith(
      { pathname: "/blog", query: { page: 1, search: "react" } },
      undefined,
      { shallow: true },
    );
    expect(screen.getByText("Search:")).toBeInTheDocument();
    expect(screen.getByText("react")).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(mockedUseSWR).toHaveBeenCalledWith(
      "/api/blog?page=1&per_page=6&search=react",
      fetcher,
      { revalidateOnFocus: false, refreshInterval: 0 },
    );
    jest.useRealTimers();
  });

  it("검색을 지우면 페이지를 1로 되돌린다", () => {
    const { container } = render(<BlogListNew />);

    fireEvent.change(screen.getByPlaceholderText("Search..."), {
      target: { value: "react" },
    });
    fireEvent.click(container.querySelector(".cursor-pointer")!);

    expect(push).toHaveBeenLastCalledWith(
      { pathname: "/blog", query: { page: 1 } },
      undefined,
      { shallow: true },
    );
    expect(
      screen.getByRole("heading", { name: "Latest Articles" }),
    ).toBeInTheDocument();
  });
});
