import { renderHook, waitFor } from "@testing-library/react";

import useIsMobile from "@/shared/hooks/useIsMobile";

jest.mock("usehooks-ts", () => ({
  useWindowSize: () => ({ width: 800, height: 600 }),
}));

describe("useIsMobile", () => {
  it("너비가 821 미만이면 모바일로 본다", async () => {
    const { result } = renderHook(() => useIsMobile());

    await waitFor(() => {
      expect(result.current).toBe(true);
    });
  });
});
