import { render, screen } from "@testing-library/react";

import BookACall from "@/features/contact/ui/BookACall";

describe("BookACall", () => {
  it("통화 예약 링크와 소요 시간을 표시한다", () => {
    render(<BookACall />);

    expect(
      screen.getByRole("heading", { name: "Book a Call" }),
    ).toBeInTheDocument();
    expect(screen.getByText("1 on 1 Chit-chat Session")).toBeInTheDocument();
    expect(
      screen.getByText("Let’s find some time to talk about anything"),
    ).toBeInTheDocument();
    expect(screen.getByText("30 Minutes")).toBeInTheDocument();
    expect(screen.getByText("Google Meet")).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute(
      "href",
      "https://cal.com/aulianza/schedule",
    );
  });
});
