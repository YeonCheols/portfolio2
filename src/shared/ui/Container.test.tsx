import { render, screen } from "@testing-library/react";

import Container from "@/shared/ui/Container";

describe("Container", () => {
  it("자식 내용을 렌더한다", () => {
    render(<Container>본문</Container>);

    expect(screen.getByText("본문")).toBeInTheDocument();
  });
});
