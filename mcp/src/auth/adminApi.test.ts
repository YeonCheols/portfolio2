import { createPortfolioAdminApi } from "@mcp/auth/adminApi";

describe("createPortfolioAdminApi", () => {
  it("portfolio-api MCP 모델 관리 API에 서비스 토큰을 bearer로 전달한다", async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [{ id: 1, environment: "development" }],
    });
    const api = createPortfolioAdminApi({
      baseUrl: "https://api.example.test/",
      serviceToken: "service-token",
      fetchImpl,
    });

    await api.request("/service/resume-model-setting");

    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api.example.test/service/resume-model-setting",
      expect.objectContaining({
        headers: expect.objectContaining({
          authorization: "Bearer service-token",
        }),
      }),
    );
  });

  it("오류 응답에서 토큰이나 서버 응답 본문을 노출하지 않고 실패한다", async () => {
    const api = createPortfolioAdminApi({
      baseUrl: "https://api.example.test",
      serviceToken: "service-token",
      fetchImpl: jest.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ message: "invalid token: service-token" }),
      }),
    });

    await expect(api.request("/service/resume-model-setting")).rejects.toThrow(
      /^PORTFOLIO_API_ADMIN_REQUEST_FAILED$/,
    );
  });

  it("서비스 설정 경로 밖의 웹앱 관리자·옛 MCP 경로는 요청하지 않는다", async () => {
    const fetchImpl = jest.fn();
    const api = createPortfolioAdminApi({
      baseUrl: "https://api.example.test",
      serviceToken: "service-token",
      fetchImpl,
    });

    for (const path of [
      "/mcp/admin/resume-model-setting",
      "/admin/resume-model-setting",
      "/admin/user/profile",
      "/service/resume-model-setting/abc",
      "/service/resume-model-setting/1/other",
    ]) {
      await expect(api.request(path)).rejects.toThrow(
        "PORTFOLIO_API_ADMIN_PATH_NOT_ALLOWED",
      );
    }
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("세션 확인은 introspect가 맡으므로 auth/check 경로를 요청하지 않는다", async () => {
    const fetchImpl = jest.fn();
    const api = createPortfolioAdminApi({
      baseUrl: "https://api.example.test",
      serviceToken: "service-token",
      fetchImpl,
    });

    await expect(api.request("/mcp/admin/user/auth/check")).rejects.toThrow(
      "PORTFOLIO_API_ADMIN_PATH_NOT_ALLOWED",
    );
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
