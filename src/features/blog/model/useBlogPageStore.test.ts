import { act, renderHook } from "@testing-library/react";

import { useBlogPageStore } from "@/features/blog/model/useBlogPageStore";

describe("useBlogPageStore", () => {
  beforeEach(() => {
    window.localStorage.clear();
    useBlogPageStore.setState({ page: 1, pageSize: 6 });
  });

  it("처음에는 1페이지와 6개 크기를 가진다", () => {
    const { result } = renderHook(() => useBlogPageStore());

    expect(result.current.page).toBe(1);
    expect(result.current.pageSize).toBe(6);
  });

  it("페이지와 크기를 바꾸면 상태에 반영한다", () => {
    const { result } = renderHook(() => useBlogPageStore());

    act(() => {
      result.current.setPage(3);
      result.current.setPageSize(12);
    });

    expect(result.current.page).toBe(3);
    expect(result.current.pageSize).toBe(12);
    expect(useBlogPageStore.getState().page).toBe(3);
  });
});
