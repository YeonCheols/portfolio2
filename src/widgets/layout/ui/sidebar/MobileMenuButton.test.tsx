import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import MobileMenuButton from "@/widgets/layout/ui/sidebar/MobileMenuButton";

describe("MobileMenuButton", () => {
  it("메뉴 버튼을 누르면 열림 상태를 반전한다", async () => {
    const user = userEvent.setup();
    const setExpandMenu = jest.fn();
    const { container } = render(
      <MobileMenuButton expandMenu={false} setExpandMenu={setExpandMenu} />,
    );

    const bars = container.querySelectorAll("span");
    expect(bars).toHaveLength(3);
    await user.click(bars[0].parentElement as HTMLElement);

    expect(setExpandMenu).toHaveBeenCalledWith(true);
  });

  it("펼쳐진 버튼을 누르면 닫히도록 전달한다", async () => {
    const user = userEvent.setup();
    const setExpandMenu = jest.fn();
    const { container } = render(
      <MobileMenuButton expandMenu setExpandMenu={setExpandMenu} />,
    );

    const bars = container.querySelectorAll("span");
    bars.forEach((bar) => {
      expect(bar.className).toContain("active");
    });

    await user.click(bars[0].parentElement as HTMLElement);

    expect(setExpandMenu).toHaveBeenCalledWith(false);
  });
});
