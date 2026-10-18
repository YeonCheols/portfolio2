import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { getGuestbookEntries } from "@/features/guestbook/api/guestbook";
import GuestbookList from "@/features/guestbook/ui/GuestbookList";

jest.mock("@/features/guestbook/api/guestbook", () => ({
  getGuestbookEntries: jest.fn(),
  getGuestbookComments: jest.fn(),
}));

const mockedGetEntries = getGuestbookEntries as jest.MockedFunction<
  typeof getGuestbookEntries
>;

const entry = {
  id: "g1",
  name: "ada",
  message: "반갑습니다",
  createdAt: "2024-05-06T07:08:00.000Z",
};

describe("GuestbookList", () => {
  beforeEach(() => {
    mockedGetEntries.mockReset();
  });

  it("방명록이 없으면 빈 문구를 표시한다", async () => {
    mockedGetEntries.mockResolvedValue([]);

    render(<GuestbookList />);

    expect(
      await screen.findByText("아직 방명록이 없습니다"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("첫 번째 방명록을 작성해보세요!"),
    ).toBeInTheDocument();
  });

  it("방명록이 하나 있으면 이름과 메시지를 표시한다", async () => {
    mockedGetEntries.mockResolvedValue([entry]);

    render(<GuestbookList />);

    expect(await screen.findByText("ada")).toBeInTheDocument();
    expect(screen.getByText("반갑습니다")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "댓글 보기" }),
    ).toBeInTheDocument();
  });

  it("불러오기에 실패하면 오류 문구를 표시하고 다시 시도하면 항목을 표시한다", async () => {
    const user = userEvent.setup();
    mockedGetEntries
      .mockRejectedValueOnce(new Error("fail"))
      .mockResolvedValueOnce([entry]);

    render(<GuestbookList />);

    expect(
      await screen.findByText("방명록을 불러오는 중 오류가 발생했습니다."),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "다시 시도" }));

    expect(await screen.findByText("반갑습니다")).toBeInTheDocument();
    expect(mockedGetEntries).toHaveBeenCalledTimes(2);
  });
});
