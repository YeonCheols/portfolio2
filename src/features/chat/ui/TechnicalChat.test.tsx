import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axios from "axios";

import TechnicalChat from "@/features/chat/ui/TechnicalChat";

jest.mock("axios");
jest.mock("@/features/chat/model/useChatStore", () => () => ({
  toggleChat: jest.fn(),
}));

const mockedPost = axios.post as jest.MockedFunction<typeof axios.post>;

describe("TechnicalChat", () => {
  it("빈 화면이면 질문 안내를 보여 준다", () => {
    render(<TechnicalChat />);

    expect(screen.getByText("기술적인 질문을 해주세요!")).toBeInTheDocument();
  });

  it("전송이 실패하면 오류 안내를 보여 준다", async () => {
    const user = userEvent.setup();
    mockedPost.mockRejectedValue(new Error("network"));
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    render(<TechnicalChat />);

    await user.type(
      screen.getByPlaceholderText("기술적인 질문을 입력하세요..."),
      "React란?",
    );
    await user.click(screen.getByRole("button", { name: "전송" }));

    expect(
      await screen.findByText(
        "죄송합니다. 답변을 생성하는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
      ),
    ).toBeInTheDocument();
  });
});
