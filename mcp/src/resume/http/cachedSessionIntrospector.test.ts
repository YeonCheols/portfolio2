import { withSessionCache } from "@mcp/resume/http/cachedSessionIntrospector";

describe("withSessionCache", () => {
  it("TTL 안에서는 같은 토큰의 활성 결과를 다시 조회하지 않는다", async () => {
    let now = 1_000;
    const introspect = jest.fn(async () => ({ active: true, sub: "7" }));
    const cached = withSessionCache(introspect, {
      ttlMs: 30_000,
      now: () => now,
    });

    await expect(cached("token-a")).resolves.toEqual({
      active: true,
      sub: "7",
    });
    now += 10_000;
    await expect(cached("token-a")).resolves.toEqual({
      active: true,
      sub: "7",
    });

    expect(introspect).toHaveBeenCalledTimes(1);
  });

  it("비활성 결과와 확인 실패는 캐시하지 않고 매번 다시 조회한다", async () => {
    const introspect = jest
      .fn()
      .mockResolvedValueOnce({ active: false })
      .mockRejectedValueOnce(new Error("TIMEOUT"))
      .mockResolvedValueOnce({ active: true, sub: "7" });
    const cached = withSessionCache(introspect, { ttlMs: 30_000 });

    await expect(cached("token-a")).resolves.toEqual({ active: false });
    await expect(cached("token-a")).rejects.toThrow("TIMEOUT");
    await expect(cached("token-a")).resolves.toEqual({
      active: true,
      sub: "7",
    });

    expect(introspect).toHaveBeenCalledTimes(3);
  });

  it("TTL이 지나면 다시 조회하고 폐기된 세션은 더 이상 통과시키지 않는다", async () => {
    let now = 1_000;
    const introspect = jest
      .fn()
      .mockResolvedValueOnce({ active: true, sub: "7" })
      .mockResolvedValueOnce({ active: false });
    const cached = withSessionCache(introspect, {
      ttlMs: 30_000,
      now: () => now,
    });

    await expect(cached("token-a")).resolves.toEqual({
      active: true,
      sub: "7",
    });
    now += 29_999;
    await expect(cached("token-a")).resolves.toEqual({
      active: true,
      sub: "7",
    });
    now += 1;
    await expect(cached("token-a")).resolves.toEqual({ active: false });

    expect(introspect).toHaveBeenCalledTimes(2);
  });

  it("토큰별로 따로 캐시하고 항목 수 상한을 넘으면 가장 오래된 항목부터 버린다", async () => {
    const introspect = jest.fn(async (token: string) => ({
      active: true,
      sub: token,
    }));
    const cached = withSessionCache(introspect, {
      ttlMs: 30_000,
      maxEntries: 2,
    });

    await expect(cached("a")).resolves.toEqual({ active: true, sub: "a" });
    await expect(cached("b")).resolves.toEqual({ active: true, sub: "b" });
    await cached("c");
    expect(introspect).toHaveBeenCalledTimes(3);

    await cached("b");
    await cached("c");
    expect(introspect).toHaveBeenCalledTimes(3);

    await cached("a");
    expect(introspect).toHaveBeenCalledTimes(4);
  });
});
