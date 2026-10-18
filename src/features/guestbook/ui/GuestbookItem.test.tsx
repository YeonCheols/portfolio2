import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { getGuestbookComments } from "@/features/guestbook/api/guestbook";
import GuestbookItem from "@/features/guestbook/ui/GuestbookItem";

jest.mock("@/features/guestbook/api/guestbook", () => ({
  getGuestbookComments: jest.fn(),
  createGuestbookComment: jest.fn(),
}));

const mockedGetComments = getGuestbookComments as jest.MockedFunction<
  typeof getGuestbookComments
>;

const createdAt = "2024-05-06T07:08:00.000Z";

describe("GuestbookItem", () => {
  beforeEach(() => {
    mockedGetComments.mockReset();
    mockedGetComments.mockResolvedValue([]);
  });

  it("이름과 메시지와 작성 시각을 표시하고 댓글은 숨긴다", () => {
    const formatted = new Date(createdAt).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    render(
      <GuestbookItem
        entry={{
          id: "g1",
          name: "ada",
          message: "반갑습니다",
          createdAt,
        }}
      />,
    );

    expect(screen.getByText("A")).toBeInTheDocument();
    expect(screen.getByText("ada")).toBeInTheDocument();
    expect(screen.getByText("반갑습니다")).toBeInTheDocument();
    expect(screen.getByText(formatted)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "댓글 보기" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("댓글 작성하기")).not.toBeInTheDocument();
    expect(mockedGetComments).not.toHaveBeenCalled();
  });

  it("댓글 보기를 누르면 작성 폼과 빈 댓글을 표시하고 다시 누르면 숨긴다", async () => {
    const user = userEvent.setup();
    render(
      <GuestbookItem
        entry={{
          id: "g1",
          name: "ada",
          message: "반갑습니다",
          createdAt,
        }}
      />,
    );

    await user.click(screen.getByRole("button", { name: "댓글 보기" }));

    expect(
      screen.getByRole("button", { name: "댓글 숨기기" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "댓글 작성하기" }),
    ).toBeInTheDocument();
    expect(
      await screen.findByText("아직 댓글이 없습니다."),
    ).toBeInTheDocument();
    expect(mockedGetComments).toHaveBeenCalledWith("g1");

    await user.click(screen.getByRole("button", { name: "댓글 숨기기" }));

    expect(screen.queryByText("댓글 작성하기")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "댓글 보기" }),
    ).toBeInTheDocument();
  });
});
