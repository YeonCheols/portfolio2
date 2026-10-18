import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import ChatItem from "@/features/chat/ui/ChatItem";

jest.mock("next/image", () => {
  const MockImage = ({ alt }: { alt: string }) => <img alt={alt} />;
  return MockImage;
});
jest.mock("next-auth/react", () => ({
  useSession: () => ({ data: { user: { email: "me@example.com" } } }),
}));

describe("ChatItem", () => {
  it("이름과 멘션을 보여 주고 삭제하면 onDelete를 호출한다", async () => {
    const user = userEvent.setup();
    const onDelete = jest.fn();
    const { container } = render(
      <ChatItem
        id="1"
        name="연철"
        email="me@example.com"
        image="/me.png"
        message="안녕 @친구: 잘 지내"
        created_at={new Date().toISOString()}
        onDelete={onDelete}
      />,
    );

    expect(screen.getByText("연철")).toBeInTheDocument();
    expect(screen.getByText("@친구")).toBeInTheDocument();

    const deleteIcon = container.querySelector(".text-red-500");
    expect(deleteIcon).not.toBeNull();
    await user.click(deleteIcon as Element);

    expect(onDelete).toHaveBeenCalledWith("1");
  });
});
