import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Router from "next/router";

import ChatWidgetHeader from "@/features/chat/ui/ChatWidgetHeader";

jest.mock("next/router", () => ({
  __esModule: true,
  default: { push: jest.fn() },
}));
jest.mock("next-auth/react", () => ({
  useSession: () => ({ data: { user: { name: "연철" } } }),
  signOut: jest.fn(),
}));
jest.mock("@/features/chat/model/useChatStore", () => () => ({
  toggleChat: jest.fn(),
}));

describe("ChatWidgetHeader", () => {
  it("확대 버튼을 누르면 방명록으로 이동한다", async () => {
    const user = userEvent.setup();
    const { container } = render(<ChatWidgetHeader />);

    expect(screen.getByText("Guestbook")).toBeInTheDocument();

    await user.click(container.querySelector(".bg-green-500") as Element);

    expect(Router.push).toHaveBeenCalledWith("/guestbook");
  });
});
