import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CodeProps } from "react-markdown/lib/ast-to-react";

import CodeBlock from "@/shared/ui/CodeBlock";

const codeProps = (overrides: Record<string, unknown> = {}): CodeProps =>
  ({
    node: {
      type: "element",
      tagName: "code",
      properties: {},
      children: [],
    },
    children: "const n = 1\n",
    className: "language-tsx",
    inline: false,
    ...overrides,
  }) as unknown as CodeProps;

describe("CodeBlock", () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it("인라인 코드면 code 요소로 렌더한다", async () => {
    render(
      <CodeBlock {...codeProps({ inline: true, children: "inline-code" })} />,
    );

    const code = await screen.findByText("inline-code");
    expect(code.tagName).toBe("CODE");
    expect(
      screen.queryByRole("button", { name: "Copy to Clipboard" }),
    ).not.toBeInTheDocument();
  });

  it("코드 블록이면 언어 클래스와 복사 버튼을 렌더한다", async () => {
    const { container } = render(<CodeBlock {...codeProps({})} />);

    expect(
      await screen.findByRole("button", { name: "Copy to Clipboard" }),
    ).toBeInTheDocument();
    expect(container.querySelector("code")).toHaveClass("language-tsx");
    expect(container).toHaveTextContent("const n = 1");
  });

  it("복사하면 클립보드에 원문을 넣고 체크 아이콘을 보여 준다", async () => {
    const user = userEvent.setup();
    render(<CodeBlock {...codeProps({})} />);

    const button = await screen.findByRole("button", {
      name: "Copy to Clipboard",
    });
    expect(button.querySelector(".text-neutral-400")).toBeInTheDocument();

    await user.click(button);

    await expect(navigator.clipboard.readText()).resolves.toBe("const n = 1\n");
    expect(button.querySelector(".text-green-600")).toBeInTheDocument();
    expect(button.querySelector(".text-neutral-400")).not.toBeInTheDocument();
  });

  it("복사 후 2초가 지나면 체크 아이콘을 숨긴다", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<CodeBlock {...codeProps({})} />);
    const button = await screen.findByRole("button", {
      name: "Copy to Clipboard",
    });

    jest.useFakeTimers();
    await user.click(button);
    expect(button.querySelector(".text-green-600")).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(button.querySelector(".text-green-600")).not.toBeInTheDocument();
  });
});
