import { readFileSync } from "fs";
import type { IncomingMessage, ServerResponse } from "http";
import { join } from "path";

import type { PortfolioAdminApi } from "@mcp/auth/adminApi";
import type { createPortfolioAdminOAuth } from "@mcp/auth/adminOAuth";
import { renderAdminConnectPage, renderAdminPage } from "@mcp/auth/adminPages";

const cookieName = "__Host-portfolio-admin-session";
const oauthCookieName = "__Host-portfolio-admin-oauth-state";
const readCookie = (req: IncomingMessage, name = cookieName): string | null => {
  for (const part of (req.headers.cookie ?? "").split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return value.join("=") || null;
  }
  return null;
};

const parseOAuthStateCookie = (value: string | null) => {
  if (!value) return null;
  try {
    const state = JSON.parse(
      Buffer.from(value, "base64url").toString("utf8"),
    ) as Record<string, unknown>;
    if (
      typeof state.state !== "string" ||
      typeof state.clientId !== "string" ||
      typeof state.codeVerifier !== "string" ||
      typeof state.redirectUri !== "string" ||
      typeof state.resource !== "string"
    ) {
      return null;
    }
    return {
      state: state.state,
      clientId: state.clientId,
      codeVerifier: state.codeVerifier,
      redirectUri: state.redirectUri,
      resource: state.resource,
    };
  } catch {
    return null;
  }
};

const readBody = async (req: IncomingMessage): Promise<string> => {
  const chunks: string[] = [];
  let size = 0;
  req.setEncoding("utf8");
  for await (const chunk of req) {
    const text = String(chunk);
    size += Buffer.byteLength(text);
    if (size > 32_768) throw new Error("BODY_TOO_LARGE");
    chunks.push(text);
  }
  return chunks.join("");
};

const redirect = (
  res: ServerResponse,
  location: string,
  cookie?: string | string[],
) => {
  res.writeHead(303, {
    location,
    "cache-control": "no-store",
    ...(cookie ? { "set-cookie": cookie } : {}),
  });
  res.end();
};

const sendJson = (res: ServerResponse, status: number, body: unknown) => {
  res.writeHead(status, {
    "cache-control": "no-store",
    "content-type": "application/json; charset=utf-8",
    "x-content-type-options": "nosniff",
  });
  res.end(JSON.stringify(body));
};

const sendHtml = (res: ServerResponse, html: string) => {
  res.writeHead(200, {
    "cache-control": "no-store",
    "content-security-policy":
      "default-src 'none'; style-src 'self'; script-src 'self'; connect-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'",
    "content-type": "text/html; charset=utf-8",
    "x-content-type-options": "nosniff",
    "referrer-policy": "no-referrer",
  });
  res.end(html);
};

const readApiPath = (pathname: string): string | null => {
  if (pathname === "/admin/ai-models/api/settings") {
    return "/mcp/admin/resume-model-setting";
  }
  const match = pathname.match(
    /^\/admin\/ai-models\/api\/settings\/(\d+)(\/activate)?$/,
  );
  return match
    ? `/mcp/admin/resume-model-setting/${match[1]}${match[2] ?? ""}`
    : null;
};

export const handleAdminRequest = async (
  req: IncomingMessage,
  res: ServerResponse,
  options: {
    api: PortfolioAdminApi;
    oauth: ReturnType<typeof createPortfolioAdminOAuth>;
    publicUrl: string;
    oauthResource: string;
  },
): Promise<boolean> => {
  const url = new URL(req.url ?? "/", options.publicUrl);
  const { pathname } = url;

  const adminAssets: Record<string, { file: string; contentType: string }> = {
    "/admin/ai-models/assets/admin.css": {
      file: "admin.css",
      contentType: "text/css; charset=utf-8",
    },
    "/admin/ai-models/assets/admin-ai-models.js": {
      file: "pages/admin-ai-models.js",
      contentType: "text/javascript; charset=utf-8",
    },
  };
  if (req.method === "GET" && adminAssets[pathname]) {
    try {
      const asset = adminAssets[pathname];
      const content = readFileSync(join(__dirname, asset.file), "utf8");
      res.writeHead(200, {
        "cache-control": "public, max-age=3600",
        "content-type": asset.contentType,
        "x-content-type-options": "nosniff",
      });
      res.end(content);
    } catch {
      res.writeHead(404);
      res.end();
    }
    return true;
  }

  if (req.method === "GET" && pathname === "/admin/ai-models/connect") {
    sendHtml(
      res,
      renderAdminConnectPage(
        url.searchParams.get("error") === "login_failed"
          ? "로그인에 실패했습니다. 계정 정보를 확인해 주세요."
          : "",
      ),
    );
    return true;
  }

  if (req.method === "POST" && pathname === "/admin/ai-models/oauth/start") {
    if (req.headers.origin !== new URL(options.publicUrl).origin) {
      redirect(res, "/admin/ai-models/connect?error=login_failed");
      return true;
    }
    try {
      const redirectUri = `${new URL(options.publicUrl).origin}/admin/ai-models/oauth/callback`;
      const authorization = await options.oauth.startAuthorization({
        redirectUri,
        resource: options.oauthResource,
      });
      const stateCookie = Buffer.from(
        JSON.stringify({
          state: authorization.state,
          clientId: authorization.clientId,
          codeVerifier: authorization.codeVerifier,
          redirectUri: authorization.redirectUri,
          resource: authorization.resource,
        }),
      ).toString("base64url");
      redirect(
        res,
        authorization.authorizationUrl,
        `${oauthCookieName}=${stateCookie}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`,
      );
    } catch {
      redirect(res, "/admin/ai-models/connect?error=login_failed");
    }
    return true;
  }

  if (req.method === "GET" && pathname === "/admin/ai-models/oauth/callback") {
    const oauthState = parseOAuthStateCookie(readCookie(req, oauthCookieName));
    if (
      url.searchParams.get("error") ||
      !oauthState ||
      url.searchParams.get("state") !== oauthState.state ||
      !url.searchParams.get("code")
    ) {
      redirect(
        res,
        "/admin/ai-models/connect?error=login_failed",
        `${oauthCookieName}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`,
      );
      return true;
    }
    try {
      const token = await options.oauth.exchangeCode({
        code: url.searchParams.get("code")!,
        clientId: oauthState.clientId,
        redirectUri: oauthState.redirectUri,
        codeVerifier: oauthState.codeVerifier,
        resource: oauthState.resource,
      });
      redirect(res, "/admin/ai-models", [
        `${cookieName}=${token.accessToken}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${Math.min(3600, token.expiresIn)}`,
        `${oauthCookieName}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`,
      ]);
    } catch {
      redirect(
        res,
        "/admin/ai-models/connect?error=login_failed",
        `${oauthCookieName}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`,
      );
    }
    return true;
  }

  if (req.method === "POST" && pathname === "/admin/ai-models/logout") {
    redirect(
      res,
      "/admin/ai-models/connect",
      `${cookieName}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`,
    );
    return true;
  }

  if (req.method === "GET" && pathname === "/admin/ai-models") {
    const token = readCookie(req);
    if (!token) {
      redirect(res, "/admin/ai-models/connect");
      return true;
    }
    try {
      await options.api.request(token, "/mcp/admin/user/auth/check");
      sendHtml(res, renderAdminPage());
    } catch {
      redirect(
        res,
        "/admin/ai-models/connect",
        `${cookieName}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`,
      );
    }
    return true;
  }

  if (pathname.startsWith("/admin/ai-models/api/")) {
    if (!readApiPath(pathname)) return false;
    const token = readCookie(req);
    if (!token) {
      sendJson(res, 401, { ok: false, code: "UNAUTHORIZED" });
      return true;
    }
    const expectedOrigin = new URL(options.publicUrl).origin;
    const mutating = !["GET", "HEAD"].includes(req.method ?? "GET");
    if (mutating && req.headers.origin !== expectedOrigin) {
      sendJson(res, 403, { ok: false, code: "INVALID_ORIGIN" });
      return true;
    }
    const apiPath = readApiPath(pathname)!;
    const method = req.method ?? "GET";
    const validMethod =
      (apiPath === "/mcp/admin/resume-model-setting" &&
        ["GET", "POST"].includes(method)) ||
      (apiPath !== "/mcp/admin/resume-model-setting" &&
        ((apiPath.endsWith("/activate") && method === "POST") ||
          (/^\/mcp\/admin\/resume-model-setting\/\d+$/.test(apiPath) &&
            ["PUT", "DELETE"].includes(method))));
    if (!validMethod) {
      sendJson(res, 405, { ok: false, code: "METHOD_NOT_ALLOWED" });
      return true;
    }
    try {
      const body =
        method === "GET" || method === "DELETE"
          ? undefined
          : await readBody(req);
      const value = await options.api.request(token, apiPath, {
        method,
        ...(body ? { body } : {}),
      });
      sendJson(res, 200, value);
    } catch (error) {
      const tooLarge =
        error instanceof Error && error.message === "BODY_TOO_LARGE";
      sendJson(res, tooLarge ? 413 : 401, {
        ok: false,
        code: tooLarge ? "BODY_TOO_LARGE" : "UNAUTHORIZED",
      });
    }
    return true;
  }

  return false;
};
