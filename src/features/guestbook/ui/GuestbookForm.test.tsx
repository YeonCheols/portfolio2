import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { createGuestbookEntry } from "@/features/guestbook/api/guestbook";
import GuestbookForm from "@/features/guestbook/ui/GuestbookForm";

jest.mock("@/features/guestbook/api/guestbook", () => ({
  createGuestbookEntry: jest.fn(),
}));

const mockedCreate = createGuestbookEntry as jest.MockedFunction<
  typeof createGuestbookEntry
>;

describe("GuestbookForm", () => {
  beforeEach(() => {
    mockedCreate.mockReset();
  });

  it("빈 값이면 제출 버튼을 비활성화하고 글자 수를 표시한다", () => {
    render(<GuestbookForm />);

    expect(
      screen.getByRole("heading", { name: "방명록 작성하기" }),
    ).toBeInTheDocument();
    expect(screen.getByText("0/50자")).toBeInTheDocument();
    expect(screen.getByText("0/500자")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "방명록 작성하기" }),
    ).toBeDisabled();
  });

  it("이름을 입력하면 글자 수를 갱신한다", async () => {
    const user = userEvent.setup();
    render(<GuestbookForm />);

    await user.type(screen.getByLabelText("이름 *"), "연철");

    expect(screen.getByText("2/50자")).toBeInTheDocument();
  });

  it("제출에 성공하면 입력을 비우고 onSuccess를 호출한다", async () => {
    const user = userEvent.setup();
    const onSuccess = jest.fn();
    mockedCreate.mockResolvedValue(true);
    render(<GuestbookForm onSuccess={onSuccess} />);

    await user.type(screen.getByLabelText("이름 *"), "연철");
    await user.type(screen.getByLabelText("메시지 *"), "안녕하세요");
    await user.click(screen.getByRole("button", { name: "방명록 작성하기" }));

    expect(mockedCreate).toHaveBeenCalledWith({
      name: "연철",
      message: "안녕하세요",
    });
    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText("이름 *")).toHaveValue("");
    expect(screen.getByLabelText("메시지 *")).toHaveValue("");
  });

  it("작성 결과가 실패면 실패 문구를 표시한다", async () => {
    const user = userEvent.setup();
    mockedCreate.mockResolvedValue(false);
    render(<GuestbookForm />);

    await user.type(screen.getByLabelText("이름 *"), "연철");
    await user.type(screen.getByLabelText("메시지 *"), "안녕하세요");
    await user.click(screen.getByRole("button", { name: "방명록 작성하기" }));

    expect(
      await screen.findByText("방명록 작성에 실패했습니다. 다시 시도해주세요."),
    ).toBeInTheDocument();
  });

  it("작성 중 예외가 나면 오류 문구를 표시한다", async () => {
    const user = userEvent.setup();
    mockedCreate.mockRejectedValue(new Error("network"));
    render(<GuestbookForm />);

    await user.type(screen.getByLabelText("이름 *"), "연철");
    await user.type(screen.getByLabelText("메시지 *"), "안녕하세요");
    await user.click(screen.getByRole("button", { name: "방명록 작성하기" }));

    expect(
      await screen.findByText("방명록 작성 중 오류가 발생했습니다."),
    ).toBeInTheDocument();
  });
});
