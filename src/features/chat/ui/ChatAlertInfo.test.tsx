import { render, screen } from "@testing-library/react";

import ChatAlertInfo from "@/features/chat/ui/ChatAlertInfo";

describe("ChatAlertInfo", () => {
  it("보낸 메시지를 수정할 수 없다는 안내를 보여 준다", () => {
    render(<ChatAlertInfo />);

    expect(
      screen.getByText(
        "Messages that you have sent cannot be changed or deleted. Type wisely.",
      ),
    ).toBeInTheDocument();
  });
});
