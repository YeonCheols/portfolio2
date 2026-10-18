import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import SocialMediaList from "@/features/contact/ui/SocialMediaList";

describe("SocialMediaList", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("소셜 버튼을 누르면 해당 주소를 새 창으로 연다", async () => {
    const user = userEvent.setup();
    const open = jest.spyOn(window, "open").mockImplementation(() => null);
    render(<SocialMediaList />);

    expect(
      screen.getByRole("heading", { name: "Find me on social media" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("button")).toHaveLength(2);

    await user.click(screen.getByRole("button", { name: "Email" }));
    await user.click(screen.getByRole("button", { name: "Github" }));

    expect(open).toHaveBeenNthCalledWith(
      1,
      "mailto:s9292909@gmail.com",
      "_blank",
    );
    expect(open).toHaveBeenNthCalledWith(
      2,
      "https://github.com/YeonCheols",
      "_blank",
    );
  });
});
