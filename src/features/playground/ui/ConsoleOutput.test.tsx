import { render, screen } from "@testing-library/react";

import ConsoleOutput from "@/features/playground/ui/ConsoleOutput";

describe("ConsoleOutput", () => {
  it("출력 문자열을 표시한다", () => {
    render(<ConsoleOutput output="hello" isError={false} />);

    expect(screen.getByText("hello")).toBeInTheDocument();
  });

  it("출력이 비어 있으면 빈 코드를 표시한다", () => {
    const { container } = render(<ConsoleOutput output="" isError={false} />);

    expect(container.querySelector("code")).toHaveTextContent("");
  });

  it("에러이면 출력에 에러 색 클래스를 둔다", () => {
    render(<ConsoleOutput output="Error: boom" isError />);

    expect(screen.getByText("Error: boom").parentElement).toHaveClass(
      "!text-red-400",
    );
  });
});
