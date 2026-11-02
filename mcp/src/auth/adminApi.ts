export type PortfolioAdminUser = { id: number; email: string };

export type PortfolioAdminApi = ReturnType<typeof createPortfolioAdminApi>;

export const createPortfolioAdminApi = (options: {
  baseUrl: string;
  fetchImpl?: typeof fetch;
}) => {
  const baseUrl = options.baseUrl.replace(/\/+$/, "");
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const timedFetch: typeof fetch = (input, init = {}) => {
    if (typeof fetchImpl !== "function") {
      return Promise.reject(new Error("FETCH_UNAVAILABLE"));
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);
    return fetchImpl(input, { ...init, signal: controller.signal }).finally(
      () => clearTimeout(timer),
    );
  };

  const request = async (
    token: string,
    path: string,
    init: RequestInit = {},
  ): Promise<unknown> => {
    if (
      !path.startsWith("/admin/resume-model-setting") &&
      path !== "/admin/user/auth/check"
    ) {
      throw new Error("PORTFOLIO_API_ADMIN_PATH_NOT_ALLOWED");
    }
    const response = await timedFetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        authorization: `Bearer ${token}`,
        ...(init.body ? { "content-type": "application/json" } : {}),
        ...init.headers,
      },
    });
    if (!response.ok) throw new Error("PORTFOLIO_API_ADMIN_REQUEST_FAILED");
    return response.json();
  };

  return {
    async login(
      email: string,
      password: string,
    ): Promise<{
      token: string;
      user: PortfolioAdminUser;
    }> {
      const response = await timedFetch(`${baseUrl}/admin/user/login`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!response.ok) throw new Error("PORTFOLIO_API_ADMIN_LOGIN_FAILED");
      const cookie = response.headers.get("set-cookie") ?? "";
      const token = cookie.match(/(?:^|[,;]\s*)access_token=([^;]+)/)?.[1];
      if (!token) throw new Error("PORTFOLIO_API_ADMIN_LOGIN_FAILED");
      const body = (await response.json()) as { user?: PortfolioAdminUser };
      if (!body.user?.id || !body.user.email) {
        throw new Error("PORTFOLIO_API_ADMIN_LOGIN_FAILED");
      }
      return { token, user: body.user };
    },
    request,
  };
};
