import { render, screen } from "@testing-library/react";

import ChatList from "@/features/chat/ui/ChatList";

jest.mock("@/features/chat/ui/ChatItem", () => {
  const ChatItem = ({ name }: { name: string }) => <article>{name}</article>;
  return ChatItem;
});

describe("ChatList", () => {
  it("메시지 작성자 이름을 보여 준다", () => {
    render(
      <ChatList
        messages={[
          {
            id: "1",
            name: "연철",
            email: "me@example.com",
            image: "",
            message: "안녕",
            created_at: new Date().toISOString(),
          },
        ]}
        onDeleteMessage={jest.fn()}
      />,
    );

    expect(screen.getByText("연철")).toBeInTheDocument();
  });
});
