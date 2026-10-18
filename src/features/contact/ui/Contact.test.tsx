import { render, screen } from "@testing-library/react";

import Contact from "@/features/contact/ui/Contact";

describe("Contact", () => {
  it("소셜 미디어와 메시지 폼을 표시한다", () => {
    render(<Contact />);

    expect(
      screen.getByRole("heading", { name: "Find me on social media" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Or send me a message" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "메일 발송하기" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Email" })).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Book a Call" }),
    ).not.toBeInTheDocument();
  });
});
