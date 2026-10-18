import { render, screen } from "@testing-library/react";

import ChatWidget from "@/features/chat/ui/ChatWidget";

jest.mock("@/features/chat/ui/ChatWidgetHeader", () => {
  const ChatWidgetHeader = () => <div>채팅 헤더</div>;
  return ChatWidgetHeader;
});

describe("ChatWidget", () => {
  it("열려 있으면 헤더를 보여 준다", () => {
    render(<ChatWidget isOpen toggleChat={jest.fn()} />);

    expect(screen.getByText("채팅 헤더")).toBeInTheDocument();
  });

  it("닫혀 있으면 위젯에 hidden 클래스를 둔다", () => {
    render(<ChatWidget isOpen={false} toggleChat={jest.fn()} />);

    expect(screen.getByText("채팅 헤더").closest(".hidden")).not.toBeNull();
  });
});
