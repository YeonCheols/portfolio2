import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect } from "react";

import CodeEditor from "@/features/playground/ui/CodeEditor";

const mockRunFormat = jest.fn();

jest.mock("@monaco-editor/react", () => {
  const MockEditor = ({
    value,
    onChange,
    onMount,
    height,
  }: {
    value?: string;
    onChange?: (value: string | undefined) => void;
    onMount?: (editor: {
      getAction: (id: string) => { run: () => void };
    }) => void;
    height?: string;
  }) => {
    useEffect(() => {
      onMount?.({
        getAction: (id: string) => ({
          run: () => mockRunFormat(id),
        }),
      });
    }, [onMount]);

    return (
      <textarea
        aria-label="code editor"
        value={value}
        style={{ height }}
        onChange={(event) => onChange?.(event.target.value)}
      />
    );
  };

  return { __esModule: true, default: MockEditor };
});

describe("CodeEditor", () => {
  beforeEach(() => {
    mockRunFormat.mockReset();
  });

  it("코드 값을 표시하고 입력하면 onChange를 호출한다", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(<CodeEditor code="" onChange={onChange} />);

    const editor = screen.getByRole("textbox", { name: "code editor" });
    expect(editor).toHaveStyle({ height: "300px" });

    await user.type(editor, "x");

    expect(onChange).toHaveBeenCalledWith("x");
  });

  it("전체 화면이면 높이를 70vh로 표시한다", () => {
    render(<CodeEditor code="" onChange={jest.fn()} isFullScreen />);

    expect(screen.getByRole("textbox", { name: "code editor" })).toHaveStyle({
      height: "70vh",
    });
  });

  it("마운트되면 문서 서식을 실행한다", () => {
    jest.useFakeTimers();
    render(<CodeEditor code="const a=1" onChange={jest.fn()} />);
    expect(screen.getByRole("textbox", { name: "code editor" })).toHaveValue(
      "const a=1",
    );

    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(mockRunFormat).toHaveBeenCalledWith("editor.action.formatDocument");
    jest.useRealTimers();
  });
});
