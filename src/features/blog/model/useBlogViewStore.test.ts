import { act, renderHook } from "@testing-library/react";

import { useBlogViewStore } from "@/features/blog/model/useBlogViewStore";

describe("useBlogViewStore", () => {
  beforeEach(() => {
    window.localStorage.clear();
    useBlogViewStore.setState({ viewOption: "grid" });
  });

  it("처음에는 그리드 보기를 가진다", () => {
    const { result } = renderHook(() => useBlogViewStore());

    expect(result.current.viewOption).toBe("grid");
  });

  it("보기 옵션을 바꾸면 상태에 반영한다", () => {
    const { result } = renderHook(() => useBlogViewStore());

    act(() => {
      result.current.setViewOption("list");
    });

    expect(result.current.viewOption).toBe("list");
    expect(useBlogViewStore.getState().viewOption).toBe("list");
  });
});
