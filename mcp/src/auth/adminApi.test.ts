import { createPortfolioAdminApi } from "@mcp/auth/adminApi";

describe("createPortfolioAdminApi", () => {
  it("portfolio-api 로그인 쿠키에서 관리자 JWT를 반환하고 토큰을 노출하지 않는다", async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      status: 201,
      headers: new Headers({
        "set-cookie": "access_token=admin-jwt; Path=/; HttpOnly; Secure",
      }),
      json: async () => ({ user: { id: 5, email: "admin@example.com" } }),
    });
    const api = createPortfolioAdminApi({
      baseUrl: "https://api.example.test",
      fetchImpl,
    });

    const result = await api.login("admin@example.com", "password");

    expect(result).toEqual({
      token: "admin-jwt",
      user: { id: 5, email: "admin@example.com" },
    });
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api.example.test/admin/user/login",
      expect.objectContaining({ method: "POST" }),
    );
    expect(JSON.stringify(result)).not.toContain("password");
  });

  it("모델 설정 API 요청에 bearer 토큰을 전달한다", async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [{ id: 1, environment: "development" }],
    });
    const api = createPortfolioAdminApi({
      baseUrl: "https://api.example.test/",
      fetchImpl,
    });

    await api.request("admin-jwt", "/admin/resume-model-setting");

    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api.example.test/admin/resume-model-setting",
      expect.objectContaining({
        headers: expect.objectContaining({
          authorization: "Bearer admin-jwt",
        }),
      }),
    );
  });

  it("오류 응답에서 토큰이나 서버 응답 본문을 노출하지 않고 실패한다", async () => {
    const api = createPortfolioAdminApi({
      baseUrl: "https://api.example.test",
      fetchImpl: jest.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ message: "invalid token: admin-jwt" }),
      }),
    });

    await expect(
      api.request("admin-jwt", "/admin/user/auth/check"),
    ).rejects.toThrow("PORTFOLIO_API_ADMIN_REQUEST_FAILED");
  });
});
