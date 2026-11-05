import { createHash, randomBytes } from "crypto";

export type PortfolioAdminOAuthAuthorization = {
  authorizationUrl: string;
  clientId: string;
  state: string;
  codeVerifier: string;
  redirectUri: string;
  resource: string;
};

export const createPortfolioAdminOAuth = (options: {
  issuer: string;
  fetchImpl?: typeof fetch;
}) => {
  const issuer = options.issuer.replace(/\/+$/, "");
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;

  return {
    async startAuthorization(input: {
      redirectUri: string;
      resource: string;
    }): Promise<PortfolioAdminOAuthAuthorization> {
      const registration = await fetchImpl(`${issuer}/register`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          redirect_uris: [input.redirectUri],
          grant_types: ["authorization_code"],
          response_types: ["code"],
          token_endpoint_auth_method: "none",
          client_name: "Portfolio AI model management",
        }),
      });
      if (!registration.ok) {
        throw new Error("PORTFOLIO_ADMIN_OAUTH_REGISTRATION_FAILED");
      }
      const registered = (await registration.json()) as {
        client_id?: unknown;
      };
      if (typeof registered.client_id !== "string" || !registered.client_id) {
        throw new Error("PORTFOLIO_ADMIN_OAUTH_REGISTRATION_FAILED");
      }

      const state = randomBytes(32).toString("base64url");
      const codeVerifier = randomBytes(32).toString("base64url");
      const codeChallenge = createHash("sha256")
        .update(codeVerifier)
        .digest("base64url");
      const authorizationUrl = new URL(`${issuer}/authorize`);
      authorizationUrl.searchParams.set("response_type", "code");
      authorizationUrl.searchParams.set("client_id", registered.client_id);
      authorizationUrl.searchParams.set("redirect_uri", input.redirectUri);
      authorizationUrl.searchParams.set("state", state);
      authorizationUrl.searchParams.set("code_challenge", codeChallenge);
      authorizationUrl.searchParams.set("code_challenge_method", "S256");
      authorizationUrl.searchParams.set("scope", "resume:use");
      authorizationUrl.searchParams.set("resource", input.resource);

      return {
        authorizationUrl: authorizationUrl.toString(),
        clientId: registered.client_id,
        state,
        codeVerifier,
        redirectUri: input.redirectUri,
        resource: input.resource,
      };
    },

    async exchangeCode(input: {
      code: string;
      clientId: string;
      redirectUri: string;
      codeVerifier: string;
      resource: string;
    }): Promise<{ accessToken: string; expiresIn: number }> {
      const response = await fetchImpl(`${issuer}/token`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          grant_type: "authorization_code",
          code: input.code,
          client_id: input.clientId,
          redirect_uri: input.redirectUri,
          code_verifier: input.codeVerifier,
          resource: input.resource,
        }),
      });
      if (!response.ok) throw new Error("PORTFOLIO_ADMIN_OAUTH_CODE_FAILED");
      const token = (await response.json()) as {
        access_token?: unknown;
        expires_in?: unknown;
        scope?: unknown;
      };
      if (
        typeof token.access_token !== "string" ||
        typeof token.expires_in !== "number" ||
        !Number.isSafeInteger(token.expires_in) ||
        token.expires_in <= 0 ||
        token.scope !== "resume:use"
      ) {
        throw new Error("PORTFOLIO_ADMIN_OAUTH_CODE_FAILED");
      }
      return { accessToken: token.access_token, expiresIn: token.expires_in };
    },
  };
};
