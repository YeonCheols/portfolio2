import { render, screen } from "@testing-library/react";

import PanelHeader from "@/features/playground/ui/PanelHeader";

describe("PanelHeader", () => {
  it("제목을 표시한다", () => {
    render(<PanelHeader title="JavaScript" />);

    expect(screen.getByText("JavaScript")).toBeInTheDocument();
  });

  it("자식이 있으면 함께 표시한다", () => {
    render(
      <PanelHeader title="Console">
        <button type="button">지우기</button>
      </PanelHeader>,
    );

    expect(screen.getByText("Console")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "지우기" })).toBeInTheDocument();
  });
});
