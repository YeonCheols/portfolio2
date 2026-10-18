import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import useChatStore from "@/features/chat/model/useChatStore";
import ChatButton from "@/features/chat/ui/ChatButton";

jest.mock("@/features/chat/ui/TechnicalChat", () => {
  const TechnicalChat = () => <div>기술 채팅</div>;
  return TechnicalChat;
});
jest.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  motion: {
    div: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  },
}));

describe("ChatButton", () => {
  afterEach(() => {
    if (useChatStore.getState().isOpen) {
      act(() => {
        useChatStore.getState().toggleChat();
      });
    }
  });

  it("버튼을 누르면 기술 채팅을 연다", async () => {
    const user = userEvent.setup();
    render(<ChatButton />);

    await user.click(screen.getByRole("button"));

    expect(screen.getByText("기술 채팅")).toBeInTheDocument();
  });
});
