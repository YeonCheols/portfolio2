import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import QueryNotFound from "@/features/cmdpallete/ui/QueryNotFound";

describe("QueryNotFound", () => {
  it("AI 질문 버튼을 누르면 콜백을 호출한다", async () => {
    const user = userEvent.setup();
    const onAskAiAssistant = jest.fn();
    render(
      <QueryNotFound
        query="zustand"
        onAskAiAssistant={onAskAiAssistant}
        onFindGoogle={jest.fn()}
      />,
    );

    expect(screen.getByText("`zustand`")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Ask AI Assistant" }));

    expect(onAskAiAssistant).toHaveBeenCalledTimes(1);
  });
});
