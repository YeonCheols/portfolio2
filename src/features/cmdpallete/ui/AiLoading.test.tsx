import { render, screen } from "@testing-library/react";

import AiLoading from "@/features/cmdpallete/ui/AiLoading";

describe("AiLoading", () => {
  it("처리 중 문구를 보여 준다", () => {
    render(<AiLoading />);

    expect(screen.getByText("AI is processing...")).toBeInTheDocument();
  });
});
