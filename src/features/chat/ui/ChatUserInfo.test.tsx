import { render, screen } from "@testing-library/react";

import ChatUserInfo from "@/features/chat/ui/ChatUserInfo";

jest.mock("next-auth/react", () => ({
  useSession: () => ({
    data: { user: { name: "연철", email: "me@example.com" } },
  }),
  signOut: jest.fn(),
}));

describe("ChatUserInfo", () => {
  it("로그인한 사용자 이름을 보여 준다", () => {
    render(<ChatUserInfo />);

    expect(screen.getByText("연철")).toBeInTheDocument();
    expect(screen.getByText("(me@example.com)")).toBeInTheDocument();
  });
});
