import { act, renderHook } from "@testing-library/react";

import useChatStore from "@/features/chat/model/useChatStore";

describe("useChatStore", () => {
  afterEach(() => {
    document.body.style.overflow = "";
    const { isOpen, toggleChat } = useChatStore.getState();
    if (isOpen) {
      act(() => {
        toggleChat();
      });
    }
  });

  it("토글하면 열림 상태가 바뀐다", () => {
    const { result } = renderHook(() => useChatStore());

    expect(result.current.isOpen).toBe(false);

    act(() => {
      result.current.toggleChat();
    });

    expect(result.current.isOpen).toBe(true);
  });

  it("모바일에서 열면 body 스크롤을 막는다", () => {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 500,
    });
    const { result } = renderHook(() => useChatStore());

    act(() => {
      result.current.toggleChat();
    });

    expect(document.body.style.overflow).toBe("hidden");
  });
});
