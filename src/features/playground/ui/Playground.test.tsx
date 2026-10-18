import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import Playground from "@/features/playground/ui/Playground";

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

const originalLog = console.log;

const clickRun = async (user: ReturnType<typeof userEvent.setup>) => {
  const runs = document.querySelectorAll(
    '[data-umami-event="Run Code Playground"]',
  );
  await user.click(runs[0] as HTMLElement);
};

describe("Playground", () => {
  afterEach(() => {
    console.log = originalLog;
  });

  it("제목 옵션이 없으면 플레이그라운드 제목을 표시하지 않는다", () => {
    render(<Playground />);

    expect(
      screen.queryByRole("heading", { name: "JavaScript Playground" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("JavaScript")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "code editor" })).toHaveValue(
      "",
    );
  });

  it("제목 옵션이 있으면 안내 문구를 표시한다", () => {
    render(<Playground isHeading />);

    expect(
      screen.getByRole("heading", { name: "JavaScript Playground" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("A no-fuss pure JavaScript playground with feedback"),
    ).toBeInTheDocument();
  });

  it("코드를 실행하면 콘솔 출력과 반환값을 표시한다", async () => {
    const user = userEvent.setup();
    render(<Playground initialCode={'console.log("안녕"); return "끝";'} />);

    await clickRun(user);

    expect(document.querySelector("code")?.textContent).toBe("안녕\n끝");
  });

  it("실행이 예외를 던지면 에러 문자열을 표시한다", async () => {
    const user = userEvent.setup();
    render(<Playground initialCode={'throw new Error("실패");'} />);

    await clickRun(user);

    expect(screen.getByText("Error: 실패")).toBeInTheDocument();
  });

  it("예외가 Error가 아니면 알 수 없는 오류를 표시한다", async () => {
    const user = userEvent.setup();
    render(<Playground initialCode={'throw "x";'} />);

    await clickRun(user);

    expect(screen.getByText("An unknown error occurred.")).toBeInTheDocument();
  });

  it("에디터를 비우면 코드가 사라지고 출력을 비우면 콘솔이 비워진다", async () => {
    const user = userEvent.setup();
    render(<Playground initialCode={'return "pong";'} />);
    const editor = screen.getByRole("textbox", { name: "code editor" });

    await clickRun(user);
    expect(screen.getByText("pong")).toBeInTheDocument();

    await user.click(
      document.querySelector(
        '[data-umami-event="Clear Output Playground"]',
      ) as HTMLElement,
    );
    expect(screen.queryByText("pong")).not.toBeInTheDocument();

    await user.click(
      document.querySelector(
        '[data-umami-event="Clear Editor Playground"]',
      ) as HTMLElement,
    );
    expect(editor).toHaveValue("");
  });
});
