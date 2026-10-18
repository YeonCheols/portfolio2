import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Router from "next/router";

import Services from "@/features/home/ui/Services";

jest.mock("next/router", () => ({
  __esModule: true,
  default: { push: jest.fn() },
}));

describe("Services", () => {
  it("문의 안내를 보여 준다", () => {
    render(<Services />);

    expect(screen.getByRole("heading", { name: "서비스" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "문의사항" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("문의사항이 있으시다면 아래 메일로 문의해주세요!"),
    ).toBeInTheDocument();
  });

  it("문의하기를 누르면 연락 페이지로 이동한다", async () => {
    const user = userEvent.setup();
    render(<Services />);

    await user.click(screen.getByRole("button", { name: "문의하기" }));

    expect(Router.push).toHaveBeenCalledWith("/contact");
  });
});
