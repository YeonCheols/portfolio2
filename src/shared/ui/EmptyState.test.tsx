import { render, screen } from "@testing-library/react";

import EmptyState from "@/shared/ui/EmptyState";

describe("EmptyState", () => {
  it("전달한 메시지를 보여 준다", () => {
    render(<EmptyState message="기록이 없습니다" />);

    expect(screen.getByText("기록이 없습니다")).toBeInTheDocument();
  });
});
