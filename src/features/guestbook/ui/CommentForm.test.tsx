import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { createGuestbookComment } from "@/features/guestbook/api/guestbook";
import CommentForm from "@/features/guestbook/ui/CommentForm";

jest.mock("@/features/guestbook/api/guestbook", () => ({
  createGuestbookComment: jest.fn(),
}));

const mockedCreate = createGuestbookComment as jest.MockedFunction<
  typeof createGuestbookComment
>;

describe("CommentForm", () => {
  beforeEach(() => {
    mockedCreate.mockReset();
  });

  it("빈 값이면 제출 버튼을 비활성화한다", () => {
    render(<CommentForm guestbookId="g1" />);

    expect(
      screen.getByRole("heading", { name: "댓글 작성하기" }),
    ).toBeInTheDocument();
    expect(screen.getByText("0/300자")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "댓글 작성" })).toBeDisabled();
  });

  it("내용을 입력하면 글자 수를 표시한다", async () => {
    const user = userEvent.setup();
    render(<CommentForm guestbookId="g1" />);

    await user.type(screen.getByPlaceholderText("댓글을 입력해주세요"), "안녕");

    expect(screen.getByText("2/300자")).toBeInTheDocument();
  });

  it("제출에 성공하면 입력을 비우고 onSuccess를 호출한다", async () => {
    const user = userEvent.setup();
    const onSuccess = jest.fn();
    mockedCreate.mockResolvedValue(true);
    render(<CommentForm guestbookId="g1" onSuccess={onSuccess} />);

    await user.type(screen.getByPlaceholderText("이름"), "연철");
    await user.type(screen.getByPlaceholderText("댓글을 입력해주세요"), "안녕");
    await user.click(screen.getByRole("button", { name: "댓글 작성" }));

    expect(mockedCreate).toHaveBeenCalledWith({
      guestbookId: "g1",
      name: "연철",
      message: "안녕",
    });
    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(screen.getByPlaceholderText("이름")).toHaveValue("");
    expect(screen.getByPlaceholderText("댓글을 입력해주세요")).toHaveValue("");
  });

  it("작성 결과가 실패면 실패 문구를 표시한다", async () => {
    const user = userEvent.setup();
    mockedCreate.mockResolvedValue(false);
    render(<CommentForm guestbookId="g1" />);

    await user.type(screen.getByPlaceholderText("이름"), "연철");
    await user.type(screen.getByPlaceholderText("댓글을 입력해주세요"), "안녕");
    await user.click(screen.getByRole("button", { name: "댓글 작성" }));

    expect(
      await screen.findByText("댓글 작성에 실패했습니다. 다시 시도해주세요."),
    ).toBeInTheDocument();
  });

  it("작성 중 예외가 나면 오류 문구를 표시한다", async () => {
    const user = userEvent.setup();
    mockedCreate.mockRejectedValue(new Error("network"));
    render(<CommentForm guestbookId="g1" />);

    await user.type(screen.getByPlaceholderText("이름"), "연철");
    await user.type(screen.getByPlaceholderText("댓글을 입력해주세요"), "안녕");
    await user.click(screen.getByRole("button", { name: "댓글 작성" }));

    expect(
      await screen.findByText("댓글 작성 중 오류가 발생했습니다."),
    ).toBeInTheDocument();
  });
});
