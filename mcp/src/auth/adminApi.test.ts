import { createPortfolioAdminApi } from "@mcp/auth/adminApi";

describe("createPortfolioAdminApi", () => {
  it("portfolio-api MCP 모델 관리 API에 bearer 토큰을 전달한다", async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [{ id: 1, environment: "development" }],
    });
    const api = createPortfolioAdminApi({
      baseUrl: "https://api.example.test/",
      fetchImpl,
    });

    await api.request("manage-token", "/mcp/admin/resume-model-setting");

    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api.example.test/mcp/admin/resume-model-setting",
      expect.objectContaining({
        headers: expect.objectContaining({
          authorization: "Bearer manage-token",
        }),
      }),
    );
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

    await api.request("admin-jwt", "/mcp/admin/resume-model-setting");

    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api.example.test/mcp/admin/resume-model-setting",
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
      api.request("admin-jwt", "/mcp/admin/user/auth/check"),
    ).rejects.toThrow("PORTFOLIO_API_ADMIN_REQUEST_FAILED");
  });

  it("기존 portfolio 관리자 경로는 요청하지 않는다", async () => {
    const fetchImpl = jest.fn();
    const api = createPortfolioAdminApi({
      baseUrl: "https://api.example.test",
      fetchImpl,
    });

    await expect(
      api.request("manage-token", "/admin/resume-model-setting"),
    ).rejects.toThrow("PORTFOLIO_API_ADMIN_PATH_NOT_ALLOWED");
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
