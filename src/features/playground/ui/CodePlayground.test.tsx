import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ComponentProps } from "react";

import CodePlayground from "@/features/playground/ui/CodePlayground";

jest.mock("@monaco-editor/react", () => ({
  __esModule: true,
  default: ({
    value,
    onChange,
  }: {
    value?: string;
    onChange?: (value: string | undefined) => void;
  }) => (
    <textarea
      aria-label="code editor"
      value={value}
      onChange={(event) => onChange?.(event.target.value)}
    />
  ),
}));

const renderPlayground = (
  props: Partial<ComponentProps<typeof CodePlayground>> = {},
) => {
  const onSetCode = jest.fn();
  const onSetOutput = jest.fn();
  const onRunCode = jest.fn();
  render(
    <CodePlayground
      code="const a = 1"
      output="done"
      onSetCode={onSetCode}
      onSetOutput={onSetOutput}
      onRunCode={onRunCode}
      {...props}
    />,
  );
  return { onSetCode, onSetOutput, onRunCode };
};

describe("CodePlayground", () => {
  it("에디터 값과 콘솔 출력과 패널 제목을 표시한다", () => {
    renderPlayground();

    expect(screen.getByText("JavaScript")).toBeInTheDocument();
    expect(screen.getByText("Console")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "code editor" })).toHaveValue(
      "const a = 1",
    );
    expect(screen.getByText("done")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "aulianza" })).toHaveAttribute(
      "href",
      "https://aulianza.id",
    );
  });

  it("실행을 누르면 onRunCode를 호출한다", async () => {
    const user = userEvent.setup();
    const { onRunCode } = renderPlayground();

    await user.click(
      document.querySelector(
        '[data-umami-event="Run Code Playground"]',
      ) as HTMLElement,
    );

    expect(onRunCode).toHaveBeenCalledTimes(1);
  });

  it("에디터를 비우면 빈 문자열로 onSetCode를 호출한다", async () => {
    const user = userEvent.setup();
    const { onSetCode } = renderPlayground();

    await user.click(
      document.querySelector(
        '[data-umami-event="Clear Editor Playground"]',
      ) as HTMLElement,
    );

    expect(onSetCode).toHaveBeenCalledWith("");
  });

  it("콘솔을 비우면 빈 문자열로 onSetOutput을 호출한다", async () => {
    const user = userEvent.setup();
    const { onSetOutput } = renderPlayground();

    await user.click(
      document.querySelector(
        '[data-umami-event="Clear Output Playground"]',
      ) as HTMLElement,
    );

    expect(onSetOutput).toHaveBeenCalledWith("");
  });

  it("코드를 바꾸면 onSetCode를 호출한다", async () => {
    const user = userEvent.setup();
    const { onSetCode } = renderPlayground({ code: "" });
    const editor = screen.getByRole("textbox", { name: "code editor" });

    await user.type(editor, "a");

    expect(onSetCode).toHaveBeenCalledWith("a");
  });
});
