import { renderHook, waitFor } from "@testing-library/react";

import useHasMounted from "@/shared/hooks/useHasMounted";

describe("useHasMounted", () => {
  it("마운트되면 true를 반환한다", async () => {
    const { result } = renderHook(() => useHasMounted());

    await waitFor(() => {
      expect(result.current).toBe(true);
    });
  });
});
