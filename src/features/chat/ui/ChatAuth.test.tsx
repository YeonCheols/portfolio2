import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { signIn } from "next-auth/react";

import ChatAuth from "@/features/chat/ui/ChatAuth";

jest.mock("next-auth/react", () => ({
  signIn: jest.fn(),
}));

describe("ChatAuth", () => {
  it("Google 로그인을 누르면 signIn을 호출한다", async () => {
    const user = userEvent.setup();
    render(<ChatAuth />);

    await user.click(
      screen.getByRole("button", { name: "Sign in with Google" }),
    );

    expect(signIn).toHaveBeenCalledWith("google");
  });
});
