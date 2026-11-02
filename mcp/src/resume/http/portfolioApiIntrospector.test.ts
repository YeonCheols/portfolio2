import {
  createPortfolioApiIntrospector,
  createPortfolioApiSessionIntrospector,
} from "@mcp/resume/http/portfolioApiIntrospector";

describe("createPortfolioApiIntrospector", () => {
  it("portfolio-api에 service token과 사용자 access token을 전달한다", async () => {
    const fetchImpl = jest.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ active: true }),
    }));
    const introspect = createPortfolioApiIntrospector({
      apiUrl: "https://api.example.test/",
      serviceToken: "service-secret",
      fetchImpl,
    });

    await expect(introspect("user-access-token")).resolves.toBe(true);
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api.example.test/auth/introspect",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          authorization: "Bearer service-secret",
          "content-type": "application/json",
        }),
        body: JSON.stringify({ client_id: "mcp", token: "user-access-token" }),
      }),
    );
  });

  it("비활성 토큰을 거부하고 API 오류는 호출자에게 전달한다", async () => {
    const inactive = createPortfolioApiIntrospector({
      apiUrl: "https://api.example.test",
      serviceToken: "service-secret",
      fetchImpl: async () => ({
        ok: true,
        status: 200,
        json: async () => ({ active: false }),
      }),
    });
    await expect(inactive("expired-token")).resolves.toBe(false);

    const unavailable = createPortfolioApiIntrospector({
      apiUrl: "https://api.example.test",
      serviceToken: "service-secret",
      fetchImpl: async () => ({
        ok: false,
        status: 500,
        json: async () => ({}),
      }),
    });
    await expect(unavailable("user-access-token")).rejects.toThrow(
      "AUTH_INTROSPECTION_FAILED",
    );
  });

  it("서비스 토큰을 HTTP 주소로 보내지 않는다", () => {
    expect(() =>
      createPortfolioApiIntrospector({
        apiUrl: "http://api.example.test",
        serviceToken: "service-secret",
        fetchImpl: async () => ({
          ok: true,
          status: 200,
          json: async () => ({ active: true }),
        }),
      }),
    ).toThrow("PORTFOLIO_API_URL must be an HTTPS origin");
  });
});

describe("createPortfolioApiSessionIntrospector", () => {
  const create = (body: unknown) =>
    createPortfolioApiSessionIntrospector({
      apiUrl: "https://api.example.test",
      serviceToken: "service-secret",
      fetchImpl: jest.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => body,
      })),
    });

  it("활성 토큰이면 사용자 식별자 sub를 함께 돌려준다", async () => {
    await expect(
      create({ active: true, sub: "7", scope: "resume:use" })("token"),
    ).resolves.toEqual({ active: true, sub: "7" });
  });
});
