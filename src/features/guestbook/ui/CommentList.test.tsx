import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { getGuestbookComments } from "@/features/guestbook/api/guestbook";
import CommentList from "@/features/guestbook/ui/CommentList";

jest.mock("@/features/guestbook/api/guestbook", () => ({
  getGuestbookComments: jest.fn(),
}));

const mockedGetComments = getGuestbookComments as jest.MockedFunction<
  typeof getGuestbookComments
>;

const comment = {
  id: "c1",
  guestbookId: "g1",
  name: "ada",
  message: "반갑습니다",
  createdAt: "2024-05-06T07:08:00.000Z",
};

describe("CommentList", () => {
  beforeEach(() => {
    mockedGetComments.mockReset();
  });

  it("댓글이 없으면 빈 문구를 표시한다", async () => {
    mockedGetComments.mockResolvedValue([]);

    render(<CommentList guestbookId="g1" />);

    expect(
      await screen.findByText("아직 댓글이 없습니다."),
    ).toBeInTheDocument();
    expect(mockedGetComments).toHaveBeenCalledWith("g1");
  });

  it("댓글이 하나 있으면 이름과 메시지를 표시한다", async () => {
    mockedGetComments.mockResolvedValue([comment]);

    render(<CommentList guestbookId="g1" />);

    expect(await screen.findByText("ada")).toBeInTheDocument();
    expect(screen.getByText("반갑습니다")).toBeInTheDocument();
  });

  it("불러오기에 실패하면 오류 문구를 표시하고 다시 시도하면 댓글을 표시한다", async () => {
    const user = userEvent.setup();
    mockedGetComments
      .mockRejectedValueOnce(new Error("fail"))
      .mockResolvedValueOnce([comment]);

    render(<CommentList guestbookId="g1" />);

    expect(
      await screen.findByText("댓글을 불러오는 중 오류가 발생했습니다."),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "다시 시도" }));

    expect(await screen.findByText("반갑습니다")).toBeInTheDocument();
    expect(mockedGetComments).toHaveBeenCalledTimes(2);
  });
});
