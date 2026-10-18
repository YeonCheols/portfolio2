import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import ChatInput from "@/features/chat/ui/ChatInput";

jest.mock("@/features/chat/ui/ChatUserInfo", () => {
  const ChatUserInfo = () => <div>사용자</div>;
  return ChatUserInfo;
});

describe("ChatInput", () => {
  it("메시지를 입력하고 전송하면 onSendMessage를 호출한다", async () => {
    const user = userEvent.setup();
    const onSendMessage = jest.fn().mockResolvedValue(undefined);
    render(<ChatInput onSendMessage={onSendMessage} />);

    await user.type(
      screen.getByPlaceholderText("Type a message..."),
      "안녕하세요",
    );
    await user.click(screen.getByRole("button"));

    expect(onSendMessage).toHaveBeenCalledWith("안녕하세요");
  });

  it("빈 메시지면 전송 버튼이 비활성화된다", () => {
    render(<ChatInput onSendMessage={jest.fn()} />);

    expect(screen.getByRole("button")).toBeDisabled();
  });
});
