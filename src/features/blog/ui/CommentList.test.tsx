import { render, screen } from "@testing-library/react";
import useSWR from "swr";

import CommentList from "@/features/blog/ui/CommentList";
import { fetcher } from "@/shared/api/fetcher";

jest.mock("swr", () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock("@/features/blog/ui/CommentItem", () => ({
  __esModule: true,
  default: ({ user }: { user: { name: string } }) => <div>{user.name}</div>,
}));

jest.mock("@/shared/ui/Loading", () => {
  const Loading = () => <div>로딩</div>;
  return Loading;
});

const mockedUseSWR = useSWR as jest.Mock;

describe("CommentList", () => {
  it("불러오는 중이면 로딩을 보여 준다", () => {
    mockedUseSWR.mockReturnValue({ data: undefined, isLoading: true });

    render(<CommentList id={7} totalComments={2} />);

    expect(mockedUseSWR).toHaveBeenCalledWith(
      "/api/comments?post_id=7",
      fetcher,
    );
    expect(screen.getByText("로딩")).toBeInTheDocument();
  });

  it("댓글이 여러 개면 복수 제목과 목록을 보여 준다", () => {
    mockedUseSWR.mockReturnValue({
      isLoading: false,
      data: {
        data: [
          { id_code: "a", user: { name: "연철" } },
          { id_code: "b", user: { name: "손님" } },
        ],
      },
    });

    render(<CommentList id={7} totalComments={2} />);

    expect(screen.getByText("2 Comments")).toBeInTheDocument();
    expect(screen.getByText("연철")).toBeInTheDocument();
    expect(screen.getByText("손님")).toBeInTheDocument();
  });

  it("댓글이 하나면 단수 제목을 보여 준다", () => {
    mockedUseSWR.mockReturnValue({
      isLoading: false,
      data: { data: [{ id_code: "a", user: { name: "연철" } }] },
    });

    render(<CommentList id={7} totalComments={1} />);

    expect(screen.getByText("1 Comment")).toBeInTheDocument();
  });

  it("댓글 수가 없으면 빈 상태를 보여 준다", () => {
    mockedUseSWR.mockReturnValue({ isLoading: false, data: { data: [] } });

    render(<CommentList id={7} totalComments={0} />);

    expect(screen.getByText("No Comment.")).toBeInTheDocument();
  });
});
