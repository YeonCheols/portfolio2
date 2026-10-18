import { render, screen } from "@testing-library/react";

import Status from "@/shared/ui/Status";

describe("Status", () => {
  it("렌더하면 협업 문구를 보여 준다", () => {
    render(<Status />);

    expect(screen.getByText("Open for collabs!")).toBeInTheDocument();
  });
});
