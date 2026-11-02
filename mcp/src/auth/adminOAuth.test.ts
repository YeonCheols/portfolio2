import { createPortfolioAdminOAuth } from "@mcp/auth/adminOAuth";

describe("createPortfolioAdminOAuth", () => {
  it("portfolio-api에 MCP 모델 관리자 OAuth client를 등록하고 portfolio-api가 허용하는 resume:use scope로 로그인한다", async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ client_id: "signed-oauth-client" }),
    });
    const oauth = createPortfolioAdminOAuth({
      issuer: "https://api.example.test/auth/",
      fetchImpl,
    });

    const result = await oauth.startAuthorization({
      redirectUri: "https://mcp.example.test/admin/ai-models/oauth/callback",
      resource: "https://mcp.example.test/mcp",
    });
    const authorization = new URL(result.authorizationUrl);

    expect(authorization.origin).toBe("https://api.example.test");
    expect(authorization.pathname).toBe("/auth/authorize");
    expect(authorization.searchParams.get("client_id")).toBe(
      "signed-oauth-client",
    );
    expect(authorization.searchParams.get("scope")).toBe("resume:use");
    expect(authorization.searchParams.get("response_type")).toBe("code");
    expect(authorization.searchParams.get("resource")).toBe(
      "https://mcp.example.test/mcp",
    );
    expect(result.state).toHaveLength(43);
    expect(result.codeVerifier).toHaveLength(43);
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api.example.test/auth/register",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("authorization code를 PKCE와 관리 resource로 교환한다", async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        access_token: "oauth-access-token",
        expires_in: 3600,
        scope: "resume:use",
      }),
    });
    const oauth = createPortfolioAdminOAuth({
      issuer: "https://api.example.test/auth",
      fetchImpl,
    });

    const token = await oauth.exchangeCode({
      code: "one-time-code",
      clientId: "signed-oauth-client",
      redirectUri: "https://mcp.example.test/admin/ai-models/oauth/callback",
      codeVerifier: "a".repeat(43),
      resource: "https://mcp.example.test/mcp",
    });

    expect(token).toEqual({
      accessToken: "oauth-access-token",
      expiresIn: 3600,
    });
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api.example.test/auth/token",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          grant_type: "authorization_code",
          code: "one-time-code",
          client_id: "signed-oauth-client",
          redirect_uri:
            "https://mcp.example.test/admin/ai-models/oauth/callback",
          code_verifier: "a".repeat(43),
          resource: "https://mcp.example.test/mcp",
        }),
      }),
    );
  });

  it("유효하지 않은 만료 시간의 access token은 거부한다", async () => {
    const oauth = createPortfolioAdminOAuth({
      issuer: "https://api.example.test/auth",
      fetchImpl: jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          access_token: "oauth-access-token",
          expires_in: 0,
          scope: "resume:use",
        }),
      }),
    });

    await expect(
      oauth.exchangeCode({
        code: "one-time-code",
        clientId: "signed-oauth-client",
        redirectUri: "https://mcp.example.test/admin/ai-models/oauth/callback",
        codeVerifier: "a".repeat(43),
        resource: "https://mcp.example.test/mcp",
      }),
    ).rejects.toThrow("PORTFOLIO_ADMIN_OAUTH_CODE_FAILED");
  });
});
