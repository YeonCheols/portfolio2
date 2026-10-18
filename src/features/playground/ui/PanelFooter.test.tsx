import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import PanelFooter from "@/features/playground/ui/PanelFooter";

describe("PanelFooter", () => {
  it("저작권 링크를 표시한다", () => {
    render(<PanelFooter />);

    expect(screen.getByRole("link", { name: "aulianza" })).toHaveAttribute(
      "href",
      "https://aulianza.id",
    );
  });

  it("전체 화면이 아니면 전체 화면 열기를 호출한다", async () => {
    const user = userEvent.setup();
    const onFullScreen = jest.fn();
    render(<PanelFooter onFullScreen={onFullScreen} />);

    await user.click(
      document.querySelector(
        '[data-umami-event="Exit Fullscreen Playground"]',
      ) as HTMLElement,
    );

    expect(onFullScreen).toHaveBeenCalledTimes(1);
  });

  it("전체 화면이면 닫기를 호출한다", async () => {
    const user = userEvent.setup();
    const onCloseFullScreen = jest.fn();
    render(<PanelFooter isFullScreen onCloseFullScreen={onCloseFullScreen} />);

    await user.click(
      document.querySelector(
        '[data-umami-event="Open Fullscreen Playground"]',
      ) as HTMLElement,
    );

    expect(onCloseFullScreen).toHaveBeenCalledTimes(1);
  });
});
