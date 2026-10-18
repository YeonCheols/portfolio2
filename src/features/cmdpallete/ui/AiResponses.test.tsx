import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import AiResponses from "@/features/cmdpallete/ui/AiResponses";

jest.mock("@/shared/ui/MDXComponent", () => {
  const MDXComponent = ({ children }: { children: string }) => (
    <div>{children}</div>
  );
  return MDXComponent;
});
jest.mock("typewriter-effect", () => ({
  __esModule: true,
  default: () => <div>타이핑</div>,
}));

describe("AiResponses", () => {
  it("코드 블록이 있으면 마크다운으로 보여 준다", () => {
    render(
      <AiResponses
        response={"```ts\nconst a = 1\n```"}
        isAiFinished={false}
        onAiFinished={jest.fn()}
        onAiClose={jest.fn()}
      />,
    );

    expect(screen.getByText(/const a = 1/)).toBeInTheDocument();
  });

  it("응답이 끝나면 뒤로 버튼을 보여 준다", async () => {
    const user = userEvent.setup();
    const onAiClose = jest.fn();
    render(
      <AiResponses
        response="안녕"
        isAiFinished
        onAiFinished={jest.fn()}
        onAiClose={onAiClose}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Back" }));

    expect(onAiClose).toHaveBeenCalledTimes(1);
  });
});
