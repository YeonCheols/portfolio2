import {
  createPublicKey,
  verify,
  type JsonWebKey as NodeJsonWebKey,
} from "crypto";
import http, { type IncomingMessage, type ServerResponse } from "http";
import { Readable } from "stream";

type JwtHeader = { alg?: string; kid?: string };
type JwtClaims = {
  aud?: string | string[];
  exp?: number;
  iat?: number;
  iss?: string;
  nbf?: number;
  scope?: string;
};

type Jwk = NodeJsonWebKey & { kid?: string; use?: string };
type Jwks = { keys: Jwk[] };
type TokenVerification =
  | { ok: true }
  | { ok: false; reason: "invalid_token" | "insufficient_scope" };

const requiredEnv = (name: string): string => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
};

const readBody = async (req: IncomingMessage): Promise<string> => {
  const chunks: string[] = [];
  let size = 0;
  req.setEncoding("utf8");
  for await (const chunk of req) {
    const text = String(chunk);
    size += Buffer.byteLength(text);
    if (size > 1_000_000) throw new Error("BODY_TOO_LARGE");
    chunks.push(text);
  }
  return chunks.join("");
};

const sendJson = (res: ServerResponse, status: number, body: unknown): void => {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
};

const getBearerToken = (req: IncomingMessage): string | null => {
  const header = req.headers.authorization;
  const match = header?.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
};

const headerValue = (
  value: string | string[] | undefined,
): string | undefined => (Array.isArray(value) ? value.join(", ") : value);

const decodeSegment = <T>(segment: string): T =>
  JSON.parse(Buffer.from(segment, "base64url").toString("utf8")) as T;

const createTokenVerifier = (options: {
  issuer: string;
  resourceUrl: string;
  jwksUrl: string;
  requiredScope: string;
}) => {
  let cachedKeys: Jwk[] = [];
  let cachedAt = 0;
  let lastUnknownKidRefreshAt = 0;
  let unknownKidRefresh: Promise<boolean> | null = null;

  const refreshForUnknownKid = (): Promise<boolean> => {
    if (unknownKidRefresh) return unknownKidRefresh;
    const now = Date.now();
    if (now - lastUnknownKidRefreshAt < 10_000) return Promise.resolve(false);

    lastUnknownKidRefreshAt = now;
    unknownKidRefresh = (async () => {
      const response = await fetch(options.jwksUrl);
      if (!response.ok) return false;
      const jwks = (await response.json()) as Jwks;
      cachedKeys = jwks.keys;
      cachedAt = Date.now();
      return true;
    })()
      .catch(() => false)
      .finally(() => {
        unknownKidRefresh = null;
      });
    return unknownKidRefresh;
  };

  return async (token: string): Promise<TokenVerification> => {
    try {
      const [encodedHeader, encodedClaims, encodedSignature] = token.split(".");
      if (!encodedHeader || !encodedClaims || !encodedSignature) {
        return { ok: false, reason: "invalid_token" };
      }

      const header = decodeSegment<JwtHeader>(encodedHeader);
      const claims = decodeSegment<JwtClaims>(encodedClaims);
      if (header.alg !== "RS256" || !header.kid) {
        return { ok: false, reason: "invalid_token" };
      }

      if (Date.now() - cachedAt > 5 * 60 * 1000 || cachedKeys.length === 0) {
        const response = await fetch(options.jwksUrl);
        if (!response.ok) return { ok: false, reason: "invalid_token" };
        const jwks = (await response.json()) as Jwks;
        cachedKeys = jwks.keys;
        cachedAt = Date.now();
      }

      let jwk = cachedKeys.find(
        (key) => key.kid === header.kid && (!key.use || key.use === "sig"),
      );
      if (!jwk && (await refreshForUnknownKid())) {
        jwk = cachedKeys.find(
          (key) => key.kid === header.kid && (!key.use || key.use === "sig"),
        );
      }
      if (!jwk) return { ok: false, reason: "invalid_token" };

      const signed = Buffer.from(`${encodedHeader}.${encodedClaims}`);
      const signature = Buffer.from(encodedSignature, "base64url");
      const signedBytes = new Uint8Array(signed.length);
      const signatureBytes = new Uint8Array(signature.length);
      for (let index = 0; index < signed.length; index += 1) {
        signedBytes[index] = signed[index];
      }
      for (let index = 0; index < signature.length; index += 1) {
        signatureBytes[index] = signature[index];
      }
      const validSignature = verify(
        "RSA-SHA256",
        signedBytes,
        createPublicKey({ key: jwk, format: "jwk" }),
        signatureBytes,
      );
      if (!validSignature) return { ok: false, reason: "invalid_token" };

      const now = Math.floor(Date.now() / 1000);
      const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
      const validClaims =
        claims.iss === options.issuer &&
        audiences.includes(options.resourceUrl) &&
        typeof claims.exp === "number" &&
        claims.exp > now &&
        typeof claims.iat === "number" &&
        claims.iat <= now + 60 &&
        (typeof claims.nbf !== "number" || claims.nbf <= now);
      if (!validClaims) return { ok: false, reason: "invalid_token" };

      const scopes = claims.scope?.split(" ") ?? [];
      if (!scopes.includes(options.requiredScope)) {
        return { ok: false, reason: "insufficient_scope" };
      }
      return { ok: true };
    } catch {
      return { ok: false, reason: "invalid_token" };
    }
  };
};

const createGateway = (options: {
  issuer: string;
  resourceUrl: string;
  jwksUrl: string;
  backendUrl: string;
  backendToken: string;
  requiredScope: string;
}) => {
  const verifyToken = createTokenVerifier(options);
  return http.createServer(async (req, res) => {
    const path = req.url?.split("?")[0];

    if (req.method === "GET" && path === "/health") {
      sendJson(res, 200, { ok: true });
      return;
    }

    if (
      req.method === "GET" &&
      (path === "/.well-known/oauth-protected-resource/mcp" ||
        path === "/.well-known/oauth-protected-resource")
    ) {
      sendJson(res, 200, {
        resource: options.resourceUrl,
        authorization_servers: [options.issuer],
        scopes_supported: [options.requiredScope],
        bearer_methods_supported: ["header"],
      });
      return;
    }

    if (req.method === "GET" && path === "/mcp") {
      const accept = headerValue(req.headers.accept) ?? "";
      if (!accept.includes("text/event-stream")) {
        res.writeHead(405, { allow: "POST" });
        res.end();
        return;
      }

      const token = getBearerToken(req);
      const tokenVerification = token
        ? await verifyToken(token)
        : { ok: false as const, reason: "invalid_token" as const };
      if (!tokenVerification.ok) {
        const metadataUrl = new URL(
          "/.well-known/oauth-protected-resource/mcp",
          options.resourceUrl,
        ).toString();
        const insufficientScope =
          tokenVerification.reason === "insufficient_scope";
        const status = insufficientScope ? 403 : 401;
        const error = insufficientScope
          ? "insufficient_scope"
          : "invalid_token";
        res.writeHead(status, {
          "content-type": "application/json",
          "www-authenticate": `Bearer resource_metadata="${metadataUrl}", error="${error}"${insufficientScope ? `, scope="${options.requiredScope}"` : ""}`,
        });
        res.end(JSON.stringify({ error }));
        return;
      }

      res.writeHead(200, {
        "content-type": "text/event-stream",
        "cache-control": "no-cache, no-transform",
        connection: "keep-alive",
      });
      res.write(": connected\n\n");
      req.on("close", () => {
        if (!res.writableEnded) res.end();
      });
      return;
    }

    if (req.method !== "POST" || path !== "/mcp") {
      res.writeHead(404);
      res.end();
      return;
    }

    const token = getBearerToken(req);
    if (!token) {
      const metadataUrl = new URL(
        "/.well-known/oauth-protected-resource/mcp",
        options.resourceUrl,
      ).toString();
      res.writeHead(401, {
        "content-type": "application/json",
        "www-authenticate": `Bearer resource_metadata="${metadataUrl}", scope="${options.requiredScope}"`,
      });
      res.end(JSON.stringify({ error: "unauthorized" }));
      return;
    }

    const tokenVerification = await verifyToken(token);
    if (!tokenVerification.ok) {
      const metadataUrl = new URL(
        "/.well-known/oauth-protected-resource/mcp",
        options.resourceUrl,
      ).toString();
      const insufficientScope =
        tokenVerification.reason === "insufficient_scope";
      const status = insufficientScope ? 403 : 401;
      const error = insufficientScope ? "insufficient_scope" : "invalid_token";
      res.writeHead(status, {
        "content-type": "application/json",
        "www-authenticate": `Bearer resource_metadata="${metadataUrl}", error="${error}"${insufficientScope ? `, scope="${options.requiredScope}"` : ""}`,
      });
      res.end(JSON.stringify({ error }));
      return;
    }

    try {
      const body = await readBody(req);
      const idTokenUrl = new URL(
        "/computeMetadata/v1/instance/service-accounts/default/identity",
        "http://metadata.google.internal",
      );
      idTokenUrl.searchParams.set(
        "audience",
        new URL(options.backendUrl).origin,
      );
      const idTokenResponse = await fetch(idTokenUrl, {
        headers: { "Metadata-Flavor": "Google" },
      });
      if (!idTokenResponse.ok) {
        sendJson(res, 502, { error: "backend_identity_unavailable" });
        return;
      }

      const idToken = await idTokenResponse.text();
      const forwardedHeaders: Record<string, string> = {
        accept:
          headerValue(req.headers.accept) ??
          "application/json, text/event-stream",
        authorization: `Bearer ${options.backendToken}`,
        "content-type":
          headerValue(req.headers["content-type"]) ?? "application/json",
        "x-serverless-authorization": `Bearer ${idToken}`,
      };
      for (const header of [
        "mcp-protocol-version",
        "mcp-session-id",
        "last-event-id",
      ] as const) {
        const value = headerValue(req.headers[header]);
        if (value) forwardedHeaders[header] = value;
      }

      const backendResponse = await fetch(options.backendUrl, {
        method: "POST",
        headers: forwardedHeaders,
        body,
      });
      const responseHeaders: Record<string, string> = {};
      for (const header of [
        "content-type",
        "cache-control",
        "mcp-session-id",
        "mcp-protocol-version",
      ]) {
        const value = backendResponse.headers.get(header);
        if (value) responseHeaders[header] = value;
      }
      res.writeHead(backendResponse.status, responseHeaders);
      if (!backendResponse.body) {
        res.end();
        return;
      }
      Readable.from(
        backendResponse.body as unknown as AsyncIterable<Uint8Array>,
      )
        .on("error", () => res.destroy())
        .pipe(res);
    } catch (error) {
      const status =
        error instanceof Error && error.message === "BODY_TOO_LARGE"
          ? 413
          : 502;
      sendJson(res, status, {
        error: status === 413 ? "request_too_large" : "gateway_error",
      });
    }
  });
};

export const startMcpOAuthGateway = () => {
  const issuer = requiredEnv("MCP_AUTH_ISSUER");
  const resourceUrl = requiredEnv("MCP_PUBLIC_URL");
  const backendUrl = requiredEnv("MCP_BACKEND_URL");
  const backendToken = requiredEnv("MCP_AUTH_TOKEN");
  const requiredScope = process.env.MCP_REQUIRED_SCOPE?.trim() || "resume:use";
  const issuerUrl = new URL(issuer);
  const resource = new URL(resourceUrl);
  const backend = new URL(backendUrl);
  if (
    issuerUrl.protocol !== "https:" ||
    resource.protocol !== "https:" ||
    resource.search !== "" ||
    resource.hash !== "" ||
    backend.protocol !== "https:" ||
    resource.pathname !== "/mcp"
  ) {
    throw new Error(
      "OAuth issuer, MCP resource, and backend URLs must use HTTPS",
    );
  }

  const server = createGateway({
    issuer,
    resourceUrl,
    jwksUrl: `${issuer.replace(/\/$/, "")}/.well-known/jwks.json`,
    backendUrl,
    backendToken,
    requiredScope,
  });
  return server.listen(Number(process.env.PORT ?? 8080));
};

if ((process.argv[1] ?? "").endsWith("gateway/server.js")) {
  startMcpOAuthGateway();
}
