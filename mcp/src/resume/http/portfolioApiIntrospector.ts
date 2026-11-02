type IntrospectionResponse = {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
};

type Fetch = (
  input: string,
  init: RequestInit,
) => Promise<IntrospectionResponse>;

export const createPortfolioApiIntrospector = (options: {
  apiUrl: string;
  serviceToken: string;
  fetchImpl?: Fetch;
}) => {
  const apiUrl = options.apiUrl.replace(/\/+$/, "");
  if (!apiUrl || !options.serviceToken) {
    throw new Error(
      "PORTFOLIO_API_URL and MCP_AUTH_SERVICE_TOKEN are required",
    );
  }
  const parsedApiUrl = new URL(apiUrl);
  if (
    parsedApiUrl.protocol !== "https:" ||
    parsedApiUrl.pathname !== "/" ||
    parsedApiUrl.search ||
    parsedApiUrl.hash
  ) {
    throw new Error("PORTFOLIO_API_URL must be an HTTPS origin");
  }
  const fetchImpl = options.fetchImpl;

  return async (token: string): Promise<boolean> => {
    const response = await (fetchImpl ?? (fetch as Fetch))(
      `${apiUrl}/auth/introspect`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${options.serviceToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ client_id: "mcp", token }),
        ...(typeof AbortSignal.timeout === "function"
          ? { signal: AbortSignal.timeout(5000) }
          : {}),
      },
    );
    if (!response.ok) throw new Error("AUTH_INTROSPECTION_FAILED");
    const body = (await response.json()) as { active?: unknown };
    return body.active === true;
  };
};
