import {
  createHash,
  createHmac,
  createPrivateKey,
  createPublicKey,
  randomBytes,
  sign,
  timingSafeEqual,
  type JsonWebKey,
} from "crypto";
import http, { type IncomingMessage, type ServerResponse } from "http";

const requiredEnv = (name: string): string => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
};

const sendJson = (res: ServerResponse, status: number, body: unknown): void => {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
};

const sendNoStoreJson = (
  res: ServerResponse,
  status: number,
  body: unknown,
): void => {
  res.writeHead(status, {
    "cache-control": "no-store",
    pragma: "no-cache",
    "content-type": "application/json",
  });
  res.end(JSON.stringify(body));
};

const redirectToClient = (
  res: ServerResponse,
  authorization: PendingAuthorization,
  result: { code?: string; error?: string },
  issuer: string,
): void => {
  const target = new URL(authorization.redirectUri);
  if (result.code) target.searchParams.set("code", result.code);
  if (result.error) target.searchParams.set("error", result.error);
  target.searchParams.set("state", authorization.clientState);
  target.searchParams.set("iss", issuer);
  res.writeHead(302, {
    location: target.toString(),
    "cache-control": "no-store",
    pragma: "no-cache",
    "referrer-policy": "no-referrer",
  });
  res.end();
};

const readLimitedUtf8 = async (
  req: IncomingMessage,
  limit: number,
): Promise<string> => {
  const chunks: string[] = [];
  let size = 0;
  req.setEncoding("utf8");
  for await (const chunk of req) {
    const text = String(chunk);
    size += Buffer.byteLength(text);
    if (size > limit) throw new Error("BODY_TOO_LARGE");
    chunks.push(text);
  }
  return chunks.join("");
};

const readForm = async (req: IncomingMessage): Promise<URLSearchParams> =>
  new URLSearchParams(await readLimitedUtf8(req, 32_768));

const readJson = async (req: IncomingMessage): Promise<unknown> =>
  JSON.parse(await readLimitedUtf8(req, 32_768));

type RegisteredClient = {
  redirect_uris: string[];
  grant_types: string[];
  response_types: string[];
  client_name?: string;
};
type PendingAuthorization = {
  clientId: string;
  redirectUri: string;
  clientState: string;
  codeChallenge: string;
  resource: string;
  scope: string;
  expiresAt: number;
};
type AuthorizationCode = PendingAuthorization & { subject: string };

const validGrantTypes = (value: unknown): boolean => {
  if (value === undefined) return true;
  if (!Array.isArray(value) || value.length === 0) return false;
  const grants = value.filter(
    (grant): grant is string => typeof grant === "string",
  );
  if (
    grants.length !== value.length ||
    new Set(grants).size !== grants.length
  ) {
    return false;
  }
  return (
    grants.includes("authorization_code") &&
    grants.every(
      (grant) => grant === "authorization_code" || grant === "refresh_token",
    )
  );
};

const validRedirectUri = (value: string): boolean => {
  try {
    const url = new URL(value);
    const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    return (
      (url.protocol === "https:" || (url.protocol === "http:" && loopback)) &&
      !url.username &&
      !url.password &&
      !url.hash
    );
  } catch {
    return false;
  }
};

const createClientIdCodec = (key: string) => {
  const sign = (payload: string) =>
    createHmac("sha256", key).update(payload).digest("base64url");
  return {
    encode: (client: RegisteredClient) => {
      const payload = Buffer.from(JSON.stringify(client)).toString("base64url");
      return `${payload}.${sign(payload)}`;
    },
    decode: (clientId: string): RegisteredClient | null => {
      const [payload, signature, extra] = clientId.split(".");
      if (!payload || !signature || extra) return null;
      const expectedBytes = Buffer.from(sign(payload));
      const receivedBytes = Buffer.from(signature);
      const expected = new Uint8Array(expectedBytes.length);
      const received = new Uint8Array(receivedBytes.length);
      for (let index = 0; index < expected.length; index += 1) {
        expected[index] = expectedBytes[index];
        received[index] = receivedBytes[index];
      }
      if (
        expected.length !== received.length ||
        !timingSafeEqual(expected, received)
      ) {
        return null;
      }
      try {
        const value = JSON.parse(
          Buffer.from(payload, "base64url").toString("utf8"),
        ) as RegisteredClient;
        return Array.isArray(value.redirect_uris) &&
          value.grant_types?.includes("authorization_code") &&
          value.response_types?.includes("code")
          ? value
          : null;
      } catch {
        return null;
      }
    },
  };
};

type SigningJwk = JsonWebKey & { kid: string; use: "sig"; alg: "RS256" };

const createSigningKey = (privateKeyValue: string): SigningJwk => {
  const privateKey = createPrivateKey(privateKeyValue.replace(/\\n/g, "\n"));
  if (
    privateKey.asymmetricKeyType !== "rsa" ||
    (privateKey.asymmetricKeyDetails?.modulusLength ?? 0) < 2048
  ) {
    throw new Error(
      "MCP OAuth signing key must be RSA with at least 2048 bits",
    );
  }
  const publicKey = createPublicKey(privateKey);
  const jwk = publicKey.export({ format: "jwk" }) as JsonWebKey;
  const exported = publicKey.export({ format: "der", type: "spki" });
  const der = new Uint8Array(exported.length);
  for (let index = 0; index < exported.length; index += 1) {
    der[index] = exported[index];
  }
  const fingerprint = createHash("sha256").update(der).digest("hex");
  return { ...jwk, kid: fingerprint.slice(0, 24), use: "sig", alg: "RS256" };
};

export const startMcpOAuthAuthorizationServer = () => {
  const issuer = requiredEnv("MCP_AUTH_ISSUER").replace(/\/$/, "");
  const resourceUrl = requiredEnv("MCP_PUBLIC_URL");
  const privateKey = requiredEnv("MCP_OAUTH_SIGNING_PRIVATE_KEY");
  const issuerUrl = new URL(issuer);
  const resource = new URL(resourceUrl);
  if (
    issuerUrl.protocol !== "https:" ||
    issuerUrl.pathname !== "/" ||
    issuerUrl.search ||
    issuerUrl.hash ||
    issuerUrl.username ||
    issuerUrl.password
  ) {
    throw new Error("MCP_AUTH_ISSUER must be an HTTPS origin");
  }
  if (
    resource.protocol !== "https:" ||
    resource.pathname !== "/mcp" ||
    resource.search ||
    resource.hash ||
    resource.username ||
    resource.password
  ) {
    throw new Error("MCP_PUBLIC_URL must be an HTTPS /mcp URL");
  }
  const githubClientId = requiredEnv("GITHUB_OAUTH_CLIENT_ID");
  const githubClientSecret = requiredEnv("GITHUB_OAUTH_CLIENT_SECRET");
  const authorizedUsers = requiredEnv("MCP_AUTHORIZED_GITHUB_USER_IDS")
    .split(",")
    .map((userId) => userId.trim());
  if (
    authorizedUsers.length === 0 ||
    authorizedUsers.some((userId) => !/^\d+$/.test(userId))
  ) {
    throw new Error("MCP_AUTHORIZED_GITHUB_USER_IDS must be numeric IDs");
  }
  const authorizedUserIds = new Set(authorizedUsers);
  const signingKey = createSigningKey(privateKey);
  const clients = createClientIdCodec(privateKey);
  const pendingAuthorizations = new Map<string, PendingAuthorization>();
  const authorizationCodes = new Map<string, AuthorizationCode>();
  const server = http.createServer(
    (req: IncomingMessage, res: ServerResponse) => {
      const path = req.url?.split("?")[0];
      if (req.method === "GET" && path === "/health") {
        sendJson(res, 200, { ok: true });
        return;
      }
      if (
        req.method === "GET" &&
        path === "/.well-known/oauth-authorization-server"
      ) {
        sendJson(res, 200, {
          issuer,
          authorization_endpoint: `${issuer}/authorize`,
          token_endpoint: `${issuer}/token`,
          registration_endpoint: `${issuer}/register`,
          jwks_uri: `${issuer}/.well-known/jwks.json`,
          response_types_supported: ["code"],
          grant_types_supported: ["authorization_code"],
          code_challenge_methods_supported: ["S256"],
          authorization_response_iss_parameter_supported: true,
          token_endpoint_auth_methods_supported: ["none"],
          scopes_supported: ["resume:use"],
          resource_parameter_supported: true,
        });
        return;
      }
      if (req.method === "GET" && path === "/.well-known/jwks.json") {
        sendJson(res, 200, { keys: [signingKey] });
        return;
      }
      if (req.method === "POST" && path === "/register") {
        void readJson(req)
          .then((value: unknown) => {
            if (!value || typeof value !== "object") {
              sendJson(res, 400, { error: "invalid_client_metadata" });
              return;
            }
            const body = value as Record<string, unknown>;
            const redirectUris = body.redirect_uris;
            if (
              !Array.isArray(redirectUris) ||
              redirectUris.length === 0 ||
              redirectUris.length > 10 ||
              redirectUris.some(
                (uri) => typeof uri !== "string" || !validRedirectUri(uri),
              ) ||
              new Set(redirectUris).size !== redirectUris.length ||
              !validGrantTypes(body.grant_types) ||
              (body.response_types !== undefined &&
                JSON.stringify(body.response_types) !==
                  JSON.stringify(["code"])) ||
              (body.token_endpoint_auth_method !== undefined &&
                body.token_endpoint_auth_method !== "none") ||
              (body.client_name !== undefined &&
                (typeof body.client_name !== "string" ||
                  body.client_name.length > 128))
            ) {
              sendJson(res, 400, { error: "invalid_client_metadata" });
              return;
            }
            const client: RegisteredClient = {
              redirect_uris: redirectUris,
              grant_types: ["authorization_code"],
              response_types: ["code"],
              ...(typeof body.client_name === "string"
                ? { client_name: body.client_name }
                : {}),
            };
            sendJson(res, 201, {
              client_id: clients.encode(client),
              client_id_issued_at: Math.floor(Date.now() / 1000),
              client_name: client.client_name,
              redirect_uris: client.redirect_uris,
              grant_types: client.grant_types,
              response_types: client.response_types,
              token_endpoint_auth_method: "none",
            });
          })
          .catch(() =>
            sendJson(res, 400, { error: "invalid_client_metadata" }),
          );
        return;
      }
      if (req.method === "GET" && path === "/authorize") {
        const url = new URL(req.url ?? "/authorize", issuer);
        const clientId = url.searchParams.get("client_id") ?? "";
        const client = clients.decode(clientId);
        const redirectUri = url.searchParams.get("redirect_uri") ?? "";
        const clientState = url.searchParams.get("state") ?? "";
        const codeChallenge = url.searchParams.get("code_challenge") ?? "";
        const resource = url.searchParams.get("resource") ?? "";
        const scopes = (url.searchParams.get("scope") ?? "").split(/\s+/);
        if (
          url.searchParams.get("response_type") !== "code" ||
          !client ||
          !client.redirect_uris.includes(redirectUri) ||
          !/^[A-Za-z0-9._~:-]{8,512}$/.test(clientState) ||
          !/^[A-Za-z0-9_-]{43}$/.test(codeChallenge) ||
          url.searchParams.get("code_challenge_method") !== "S256" ||
          resource !== resourceUrl ||
          !scopes.includes("resume:use")
        ) {
          sendJson(res, 400, { error: "invalid_request" });
          return;
        }
        const state = randomBytes(32).toString("base64url");
        const now = Date.now();
        for (const [key, value] of pendingAuthorizations) {
          if (value.expiresAt <= now) pendingAuthorizations.delete(key);
        }
        pendingAuthorizations.set(state, {
          clientId,
          redirectUri,
          clientState,
          codeChallenge,
          resource,
          scope: "resume:use",
          expiresAt: now + 10 * 60 * 1000,
        });
        const githubAuthorizationUrl = new URL(
          "https://github.com/login/oauth/authorize",
        );
        githubAuthorizationUrl.searchParams.set("client_id", githubClientId);
        githubAuthorizationUrl.searchParams.set(
          "redirect_uri",
          `${issuer}/github/callback`,
        );
        githubAuthorizationUrl.searchParams.set("scope", "read:user");
        githubAuthorizationUrl.searchParams.set("state", state);
        res.writeHead(302, { location: githubAuthorizationUrl.toString() });
        res.end();
        return;
      }
      if (req.method === "GET" && path === "/github/callback") {
        const url = new URL(req.url ?? "/github/callback", issuer);
        const state = url.searchParams.get("state") ?? "";
        const pending = pendingAuthorizations.get(state);
        if (!pending || pending.expiresAt <= Date.now()) {
          pendingAuthorizations.delete(state);
          sendJson(res, 400, { error: "invalid_authorization_state" });
          return;
        }
        pendingAuthorizations.delete(state);
        if (url.searchParams.has("error") || !url.searchParams.get("code")) {
          redirectToClient(res, pending, { error: "access_denied" }, issuer);
          return;
        }
        void (async () => {
          try {
            const tokenResponse = await fetch(
              "https://github.com/login/oauth/access_token",
              {
                method: "POST",
                headers: { accept: "application/json" },
                body: new URLSearchParams({
                  client_id: githubClientId,
                  client_secret: githubClientSecret,
                  code: url.searchParams.get("code") ?? "",
                  redirect_uri: `${issuer}/github/callback`,
                }),
              },
            );
            if (!tokenResponse.ok) {
              sendJson(res, 502, { error: "github_token_exchange_failed" });
              return;
            }
            const tokenPayload = (await tokenResponse.json()) as {
              access_token?: string;
            };
            if (!tokenPayload.access_token) {
              sendJson(res, 502, { error: "github_token_exchange_failed" });
              return;
            }
            const profileResponse = await fetch("https://api.github.com/user", {
              headers: {
                accept: "application/vnd.github+json",
                authorization: `Bearer ${tokenPayload.access_token}`,
                "x-github-api-version": "2022-11-28",
              },
            });
            if (!profileResponse.ok) {
              sendJson(res, 502, { error: "github_identity_lookup_failed" });
              return;
            }
            const profile = (await profileResponse.json()) as { id?: unknown };
            if (
              typeof profile.id !== "number" ||
              !Number.isSafeInteger(profile.id)
            ) {
              sendJson(res, 502, { error: "github_identity_lookup_failed" });
              return;
            }
            const subject = String(profile.id);
            if (!authorizedUserIds.has(subject)) {
              redirectToClient(
                res,
                pending,
                { error: "access_denied" },
                issuer,
              );
              return;
            }
            const now = Date.now();
            for (const [key, value] of authorizationCodes) {
              if (value.expiresAt <= now) authorizationCodes.delete(key);
            }
            const authorizationCode = randomBytes(32).toString("base64url");
            authorizationCodes.set(authorizationCode, {
              ...pending,
              subject,
              expiresAt: now + 60 * 1000,
            });
            redirectToClient(res, pending, { code: authorizationCode }, issuer);
          } catch {
            sendJson(res, 502, { error: "github_authentication_failed" });
          }
        })();
        return;
      }
      if (req.method === "POST" && path === "/token") {
        void readForm(req)
          .then((form) => {
            const code = form.get("code") ?? "";
            const authorization = authorizationCodes.get(code);
            authorizationCodes.delete(code);
            const clientId = form.get("client_id") ?? "";
            const redirectUri = form.get("redirect_uri") ?? "";
            const verifier = form.get("code_verifier") ?? "";
            const client = clients.decode(clientId);
            const challenge = /^[A-Za-z0-9._~-]{43,128}$/.test(verifier)
              ? createHash("sha256").update(verifier).digest("base64url")
              : "";
            if (
              form.get("grant_type") !== "authorization_code" ||
              !authorization ||
              authorization.expiresAt <= Date.now() ||
              authorization.clientId !== clientId ||
              !client ||
              !client.redirect_uris.includes(redirectUri) ||
              authorization.redirectUri !== redirectUri ||
              authorization.codeChallenge !== challenge ||
              form.get("resource") !== authorization.resource
            ) {
              sendNoStoreJson(res, 400, { error: "invalid_grant" });
              return;
            }
            const now = Math.floor(Date.now() / 1000);
            const header = Buffer.from(
              JSON.stringify({ alg: "RS256", typ: "JWT", kid: signingKey.kid }),
            ).toString("base64url");
            const claims = Buffer.from(
              JSON.stringify({
                iss: issuer,
                sub: authorization.subject,
                aud: authorization.resource,
                iat: now,
                exp: now + 3600,
                scope: authorization.scope,
              }),
            ).toString("base64url");
            const signingInput = `${header}.${claims}`;
            const signingBytes = Buffer.from(signingInput);
            const data = new Uint8Array(signingBytes.length);
            for (let index = 0; index < signingBytes.length; index += 1) {
              data[index] = signingBytes[index];
            }
            const signature = sign(
              "RSA-SHA256",
              data,
              createPrivateKey(privateKey.replace(/\\n/g, "\n")),
            ).toString("base64url");
            sendNoStoreJson(res, 200, {
              access_token: `${signingInput}.${signature}`,
              token_type: "Bearer",
              expires_in: 3600,
              scope: authorization.scope,
            });
          })
          .catch(() => sendNoStoreJson(res, 400, { error: "invalid_request" }));
        return;
      }
      res.writeHead(404);
      res.end();
    },
  );
  return server.listen(Number(process.env.PORT ?? 8080));
};

if ((process.argv[1] ?? "").endsWith("auth/server.js")) {
  startMcpOAuthAuthorizationServer();
}
