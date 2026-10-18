import { render, screen } from "@testing-library/react";

import Loading from "@/shared/ui/Loading";

describe("Loading", () => {
  it("문구가 없으면 문단 없이 스피너를 렌더한다", () => {
    const { container } = render(<Loading />);

    expect(container.querySelector("p")).not.toBeInTheDocument();
    expect(container.querySelector("span")).toHaveStyle({
      width: "50px",
      height: "50px",
    });
    expect(container.firstChild).not.toHaveClass("h-screen");
  });

  it("문구를 넘기면 그 텍스트를 렌더한다", () => {
    render(<Loading text="불러오는 중" />);

    expect(screen.getByText("불러오는 중")).toBeInTheDocument();
  });

  it("빈 문자열이면 문단을 렌더하지 않는다", () => {
    const { container } = render(<Loading text="" />);

    expect(container.querySelector("p")).not.toBeInTheDocument();
  });

  it("전체 화면이면 h-screen을 둔다", () => {
    const { container } = render(<Loading isFullScreen text="대기" />);

    expect(container.firstChild).toHaveClass("h-screen");
    expect(screen.getByText("대기")).toBeInTheDocument();
  });
});
