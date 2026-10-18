import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import ModalWrapper from "@/shared/ui/ModalWrapper";

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

global.ResizeObserver = ResizeObserverMock;

beforeAll(() => {
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

describe("ModalWrapper", () => {
  it("열리면 내용을 보여 준다", () => {
    render(
      <ModalWrapper isOpen onClose={jest.fn()}>
        <button type="button">모달 내용</button>
      </ModalWrapper>,
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("모달 내용")).toBeInTheDocument();
  });

  it("닫혀 있으면 내용을 보여 주지 않는다", () => {
    render(
      <ModalWrapper isOpen={false} onClose={jest.fn()}>
        <p>숨긴 내용</p>
      </ModalWrapper>,
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByText("숨긴 내용")).not.toBeInTheDocument();
  });

  it("Escape를 누르면 닫기 핸들러를 호출한다", async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    render(
      <ModalWrapper isOpen onClose={onClose}>
        <button type="button">모달 내용</button>
      </ModalWrapper>,
    );

    await user.keyboard("{Escape}");

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
