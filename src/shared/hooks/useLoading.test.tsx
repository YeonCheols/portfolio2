import { renderHook, waitFor } from "@testing-library/react";

import useLoading from "@/shared/hooks/useLoading";

jest.mock("next/router", () => ({
  useRouter: () => ({ isReady: true }),
}));

describe("useLoading", () => {
  it("라우터가 준비되면 로딩을 끝낸다", async () => {
    const { result } = renderHook(() => useLoading());

    await waitFor(() => {
      expect(result.current).toBe(false);
    });
  });
});
