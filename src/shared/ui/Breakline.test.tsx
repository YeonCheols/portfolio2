import { render, screen } from "@testing-library/react";

import Breakline from "@/shared/ui/Breakline";

describe("Breakline", () => {
  it("구분선을 렌더한다", () => {
    render(<Breakline />);

    expect(screen.getByTestId("breakline")).toBeInTheDocument();
  });
});
