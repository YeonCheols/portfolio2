import { render, screen } from "@testing-library/react";
import useSWR from "swr";

import BlogCarousel from "@/widgets/home/ui/BlogCarousel";

jest.mock("swr", () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock("react-use-draggable-scroll", () => ({
  useDraggable: () => ({ events: {} }),
}));

jest.mock("@/features/blog/ui/BlogCardNew", () => {
  const BlogCardNew = ({ title }: { title: string }) => (
    <article>{title}</article>
  );
  return BlogCardNew;
});

const mockedUseSWR = useSWR as jest.Mock;

describe("BlogCarousel", () => {
  it("포스트를 불러오면 제목을 보여 준다", () => {
    mockedUseSWR.mockReturnValue({
      isLoading: false,
      error: undefined,
      data: {
        data: {
          posts: [
            { id: 1, title: "첫 글" },
            { id: 2, title: "둘째 글" },
          ],
        },
      },
    });

    render(<BlogCarousel />);

    expect(screen.getByText("첫 글")).toBeInTheDocument();
    expect(screen.getByText("둘째 글")).toBeInTheDocument();
    expect(screen.queryByText("포스트가 없습니다")).not.toBeInTheDocument();
  });

  it("포스트가 없으면 빈 상태를 보여 준다", () => {
    mockedUseSWR.mockReturnValue({
      isLoading: false,
      error: undefined,
      data: { data: { posts: [] } },
    });

    render(<BlogCarousel />);

    expect(screen.getByText("포스트가 없습니다")).toBeInTheDocument();
  });

  it("오류가 나면 오류 문구를 보여 준다", () => {
    mockedUseSWR.mockReturnValue({
      isLoading: false,
      error: new Error("fail"),
      data: undefined,
    });

    render(<BlogCarousel />);

    expect(screen.getByText("오류가 발생했습니다")).toBeInTheDocument();
  });

  it("불러오는 중이면 스켈레톤과 빈 상태를 함께 보여 준다", () => {
    mockedUseSWR.mockReturnValue({
      isLoading: true,
      error: undefined,
      data: undefined,
    });

    render(<BlogCarousel />);

    expect(
      document.querySelectorAll(".react-loading-skeleton").length,
    ).toBeGreaterThan(0);
    expect(screen.getByText("포스트가 없습니다")).toBeInTheDocument();
  });
});
