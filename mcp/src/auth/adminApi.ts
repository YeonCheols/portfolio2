export type PortfolioAdminApi = ReturnType<typeof createPortfolioAdminApi>;

export const createPortfolioAdminApi = (options: {
  baseUrl: string;
  serviceToken: string;
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
    path: string,
    init: RequestInit = {},
  ): Promise<unknown> => {
    if (
      path !== "/service/resume-model-setting" &&
      !/^\/service\/resume-model-setting\/\d+(?:\/activate)?$/.test(path)
    ) {
      throw new Error("PORTFOLIO_API_ADMIN_PATH_NOT_ALLOWED");
    }
    const response = await timedFetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        authorization: `Bearer ${options.serviceToken}`,
        ...(init.body ? { "content-type": "application/json" } : {}),
        ...init.headers,
      },
    });
    if (!response.ok) throw new Error("PORTFOLIO_API_ADMIN_REQUEST_FAILED");
    return response.json();
  };

  return { request };
};
