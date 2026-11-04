import { readFileSync } from "fs";
import type { IncomingMessage, ServerResponse } from "http";
import { extname, join } from "path";

import type { PortfolioAdminApi } from "@mcp/auth/adminApi";
import { adminMenuPath, adminPagePaths } from "@mcp/auth/adminMenu";
import type { createPortfolioAdminOAuth } from "@mcp/auth/adminOAuth";
import type { SettingConnectionTester } from "@mcp/auth/settingConnectionTest";
import type { IntrospectedSession } from "@mcp/resume/http/portfolioApiIntrospector";
import {
  ArchiveBusyError,
  type ReproductionAction,
  type ReproductionSource,
} from "@mcp/resume/output/reproduceResumeArchive";
import type { ResumeDebugArchiveAdmin } from "@mcp/resume/output/resumeDebugArchiveAdmin";
import {
  ArchiveNotFoundError,
  ArchiveQueryError,
} from "@mcp/resume/output/resumeDebugArchiveReader";
import {
  ArchiveDeleteError,
  ArchiveRevisionError,
} from "@mcp/resume/output/resumeDebugArchiveWriter";

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
      next: typeof state.next === "string" ? state.next : undefined,
    };
  } catch {
    return null;
  }
};

const modelEnvironments = ["development", "production"];

// 환경을 요청이 명시해야 하므로 없거나 모르는 값이면 null로 거절한다
const parseTestEnvironment = (body: string): string | null => {
  try {
    const value = (JSON.parse(body) as { environment?: unknown } | null)
      ?.environment;
    return typeof value === "string" && modelEnvironments.includes(value)
      ? value
      : null;
  } catch {
    return null;
  }
};

const readBody = async (
  req: IncomingMessage,
  maxBytes = 32_768,
): Promise<string> => {
  const chunks: string[] = [];
  let size = 0;
  req.setEncoding("utf8");
  for await (const chunk of req) {
    const text = String(chunk);
    size += Buffer.byteLength(text);
    if (size > maxBytes) throw new Error("BODY_TOO_LARGE");
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

// portfolio-api의 인증 서버가 GitHub 로그인으로 다시 넘기며, Chrome은 폼 제출 뒤 리다이렉트 목적지도 form-action으로 검사한다
const identityProviderOrigin = "https://github.com";

const sendHtml = (res: ServerResponse, html: string, formAction = "'self'") => {
  res.writeHead(200, {
    "cache-control": "no-store",
    "content-security-policy": `default-src 'none'; style-src 'self'; script-src 'self'; connect-src 'self'; form-action ${formAction}; frame-ancestors 'none'; base-uri 'none'`,
    "content-type": "text/html; charset=utf-8",
    "x-content-type-options": "nosniff",
    // no-referrer면 브라우저가 폼 POST에 Origin: null을 보내 로그인 시작의 출처 검사가 항상 실패한다
    "referrer-policy": "same-origin",
  });
  res.end(html);
};

// 빌드 산출물이 없을 때 오류를 던지면 요청 핸들러가 죽어 MCP 서버 전체가 종료된다
const sendApp = (res: ServerResponse, appRoot: string, formAction?: string) => {
  let html: string;
  try {
    html = readFileSync(join(appRoot, "index.html"), "utf8");
  } catch {
    sendJson(res, 503, { ok: false, code: "APP_UNAVAILABLE" });
    return;
  }
  sendHtml(res, html, formAction);
};

const assetContentTypes: Record<string, string> = {
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
};

// sub는 외부 응답 값이라 줄바꿈 등으로 로그 줄을 위조하지 못하도록 안전한 문자만 허용한다
const logSubject = (sub: string | undefined): string =>
  sub !== undefined && /^[A-Za-z0-9_-]{1,64}$/.test(sub) ? sub : "unknown";

// 결과 코드는 주입된 함수의 값이라, 로그 줄을 위조하지 못하도록 정해진 형식일 때만 남긴다
const logTestResult = (result: { ok: boolean; code?: string }): string => {
  if (result.ok) return "ok";
  const code =
    result.code !== undefined && /^[A-Z_]{1,64}$/.test(result.code)
      ? result.code
      : "unknown";
  return `failed code=${code}`;
};

const readApiPath = (pathname: string): string | null => {
  if (pathname === "/admin/ai-models/api/settings") {
    return "/service/resume-model-setting";
  }
  const match = pathname.match(
    /^\/admin\/ai-models\/api\/settings\/(\d+)(\/activate)?$/,
  );
  return match
    ? `/service/resume-model-setting/${match[1]}${match[2] ?? ""}`
    : null;
};

const connectPath = "/admin/ai-models/connect";
const debugPagePath = "/admin/debug/resume";
const debugApiPrefix = `${debugPagePath}/api/`;

// 로그인 뒤 돌아갈 수 있는 화면은 공통 메뉴(adminMenu)에 있는 경로뿐이다. 쿠키로 오가는 값이라 사용할 때마다 다시 검증한다
const returnPagePaths = adminPagePaths;
const placeholderOrigin = "https://return.invalid";
const safeReturnPath = (value: string | null | undefined): string | null => {
  if (!value || value.length > 600 || !value.startsWith("/")) return null;
  let parsed: URL;
  try {
    parsed = new URL(value, placeholderOrigin);
  } catch {
    return null;
  }
  if (
    parsed.origin !== placeholderOrigin ||
    !returnPagePaths.includes(parsed.pathname)
  )
    return null;
  // 정규화된 상대 경로만 돌려줘 Location 헤더가 외부로 향하지 않게 한다
  return `${parsed.pathname}${parsed.search}`;
};

// 로그인 뒤 기본 이동지는 메뉴 화면이라 메뉴로 가는 경우에는 next를 싣지 않는다
const connectLocation = (next?: string): string =>
  next && next !== adminMenuPath
    ? `${connectPath}?next=${encodeURIComponent(next)}`
    : connectPath;

// 관리 화면 공통: 세션 쿠키를 확인한 뒤에만 앱을 서빙하고 무효면 로그인으로 보낸다
const serveAuthenticatedApp = async (
  req: IncomingMessage,
  res: ServerResponse,
  options: {
    introspect: (token: string) => Promise<IntrospectedSession>;
    appRoot: string;
    // 로그인 뒤 돌아올 화면 경로. 메뉴 화면은 기본 이동지라 싣지 않는다
    next?: string;
  },
): Promise<void> => {
  const token = readCookie(req);
  if (!token) {
    redirect(res, connectLocation(options.next));
    return;
  }
  let session: IntrospectedSession;
  try {
    session = await options.introspect(token);
  } catch {
    // 확인 호출이 실패한 것이지 세션이 무효인 것이 아니므로 로그아웃시키지 않는다
    sendJson(res, 503, { ok: false, code: "AUTH_UNAVAILABLE" });
    return;
  }
  if (!session.active) {
    redirect(
      res,
      connectLocation(options.next),
      `${cookieName}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`,
    );
    return;
  }
  sendApp(res, options.appRoot);
};

const optionalParam = (url: URL, name: string): string | undefined =>
  url.searchParams.get(name) || undefined;

// 검증은 reader 한 곳에서 하므로 비어 있으면 빈 문자열로 넘겨 거절되게 한다
const archiveKey = (url: URL) => ({
  environment: url.searchParams.get("environment") ?? "",
  subjectHash: url.searchParams.get("subjectHash") ?? "",
  generationId: url.searchParams.get("generationId") ?? "",
  attemptId: url.searchParams.get("attemptId") ?? "",
});

const optionalNumber = (url: URL, name: string): number | undefined => {
  const value = optionalParam(url, name);
  return value === undefined ? undefined : Number(value);
};

type DebugRoute = {
  action: string;
  run: (
    archive: ResumeDebugArchiveAdmin,
    url: URL,
    body: Record<string, unknown>,
  ) => Promise<Record<string, unknown>>;
};

const text = (value: unknown): string =>
  typeof value === "string" ? value : "";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const bodyKey = (body: Record<string, unknown>) => ({
  environment: text(body.environment),
  subjectHash: text(body.subjectHash),
  generationId: text(body.generationId),
  attemptId: text(body.attemptId),
});

// 수정본 응답은 최대 100만 자라 일반 요청보다 큰 본문을 받는다
const maxDebugBodyBytes = 4 * 1024 * 1024;

// 재현한 PDF를 응답 본문에 싣는 최대 크기. 넘으면 본문은 생략하고 크기만 기록으로 알린다
export const maxPdfResponseBytes = 5 * 1024 * 1024;

// "메서드 경로"로 찾는다. 읽기는 GET, 기록을 바꾸는 동작은 모두 POST다
const debugRoutes: Record<string, DebugRoute> = {
  "GET archives": {
    action: "list",
    run: async (archive, url) =>
      archive.list({
        environment: url.searchParams.get("environment") ?? "",
        generationId: optionalParam(url, "generationId"),
        attemptId: optionalParam(url, "attemptId"),
        failedStage: optionalParam(url, "failedStage"),
        page: optionalNumber(url, "page"),
        pageSize: optionalNumber(url, "pageSize"),
      }),
  },
  "GET archives/detail": {
    action: "detail",
    run: async (archive, url) => ({ ...(await archive.get(archiveKey(url))) }),
  },
  "GET archives/file-url": {
    action: "file-url",
    run: async (archive, url) => ({
      url: await archive.signedUrl(
        archiveKey(url),
        url.searchParams.get("file") ?? "",
      ),
    }),
  },
  "GET archives/revisions": {
    action: "revisions",
    run: async (archive, url) => ({
      items: await archive.listRevisions(archiveKey(url)),
    }),
  },
  "GET archives/revision": {
    action: "revision",
    run: async (archive, url) => ({
      revision: await archive.getRevision(
        archiveKey(url),
        url.searchParams.get("revisionId") ?? "",
      ),
    }),
  },
  "POST archives/revisions": {
    action: "revise",
    run: async (archive, _url, body) =>
      archive.saveRevision(bodyKey(body), {
        baseFile: text(body.baseFile),
        ...(body.request !== undefined ? { request: body.request } : {}),
        response: body.response as string,
      }),
  },
  "GET archives/reproductions": {
    action: "reproductions",
    run: async (archive, url) => ({
      items: await archive.listReproductions(archiveKey(url)),
    }),
  },
  "POST archives/reproductions": {
    action: "reproduce",
    run: async (archive, _url, body) => {
      const { record, pdf } = await archive.reproduce(bodyKey(body), {
        source: (isRecord(body.source)
          ? body.source
          : {}) as ReproductionSource,
        action: body.action as ReproductionAction,
      });
      if (!pdf) return { record };
      // 본문이 너무 크면 싣지 않고 생략했음을 알린다. 크기는 기록의 pdf.byteLength에 있다
      return pdf.length > maxPdfResponseBytes
        ? { record, pdfOmitted: true }
        : { record, pdfBase64: pdf.toString("base64") };
    },
  },
  "POST archives/delete": {
    action: "delete",
    run: async (archive, _url, body) =>
      archive.removeAttempt(bodyKey(body), text(body.confirm)),
  },
};

// 오류 원문은 싣지 않고 정해진 코드와 개수만 응답한다. 로그에 남길 코드를 돌려준다
const sendDebugError = (res: ServerResponse, error: unknown): string => {
  const reply = (status: number, code: string, extra: object = {}) => {
    sendJson(res, status, { ok: false, code, ...extra });
    return code;
  };
  if (error instanceof ArchiveQueryError) return reply(400, "INVALID_REQUEST");
  if (error instanceof ArchiveNotFoundError)
    return reply(404, "ARCHIVE_NOT_FOUND");
  if (error instanceof ArchiveRevisionError) return reply(422, error.code);
  if (error instanceof ArchiveBusyError) return reply(409, error.code);
  if (error instanceof ArchiveDeleteError) {
    return error.code === "DELETE_PARTIAL"
      ? reply(502, error.code, {
          removed: error.removed,
          remaining: error.remaining,
        })
      : reply(400, error.code);
  }
  if (error instanceof Error && error.message === "BODY_TOO_LARGE")
    return reply(413, "BODY_TOO_LARGE");
  return reply(502, "STORAGE_FAILED");
};

// 아카이브 API: 세션·같은 출처·메서드를 확인한 뒤에만 서비스를 부른다
const handleDebugArchiveApi = async (
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
  options: {
    introspect: (token: string) => Promise<IntrospectedSession>;
    publicUrl: string;
    debugArchive?: ResumeDebugArchiveAdmin;
    log?: (message: string) => void;
  },
): Promise<void> => {
  const token = readCookie(req);
  if (!token) {
    sendJson(res, 401, { ok: false, code: "UNAUTHORIZED" });
    return;
  }
  const method = req.method ?? "GET";
  if (
    !["GET", "HEAD"].includes(method) &&
    req.headers.origin !== new URL(options.publicUrl).origin
  ) {
    sendJson(res, 403, { ok: false, code: "INVALID_ORIGIN" });
    return;
  }
  const suffix = url.pathname.slice(debugApiPrefix.length);
  const route = debugRoutes[`${method} ${suffix}`];
  const knownPath = Object.keys(debugRoutes).some((name) =>
    name.endsWith(` ${suffix}`),
  );
  if (!route && (knownPath || method !== "GET")) {
    sendJson(res, 405, { ok: false, code: "METHOD_NOT_ALLOWED" });
    return;
  }
  let session: IntrospectedSession;
  try {
    session = await options.introspect(token);
  } catch {
    sendJson(res, 503, { ok: false, code: "AUTH_UNAVAILABLE" });
    return;
  }
  if (!session.active) {
    sendJson(res, 401, { ok: false, code: "UNAUTHORIZED" });
    return;
  }
  const archive = options.debugArchive;
  if (!archive) {
    sendJson(res, 503, { ok: false, code: "DEBUG_ARCHIVE_UNAVAILABLE" });
    return;
  }
  if (!route) {
    sendJson(res, 404, { ok: false, code: "NOT_FOUND" });
    return;
  }
  // 이력서 원문을 여는 읽기와 기록을 바꾸는 동작 모두 누가 무엇을 했는지만 남기고 ID·URL·오류 원문은 남기지 않는다
  const logResult = (result: string) =>
    options.log?.(
      `ADMIN_DEBUG_ARCHIVE sub=${logSubject(session.sub)} action=${route.action} result=${result}`,
    );
  try {
    let body: Record<string, unknown> = {};
    if (method === "POST") {
      let parsed: unknown;
      try {
        parsed = JSON.parse(await readBody(req, maxDebugBodyBytes));
      } catch (error) {
        if (error instanceof Error && error.message === "BODY_TOO_LARGE")
          throw error;
        throw new ArchiveQueryError();
      }
      if (!isRecord(parsed)) throw new ArchiveQueryError();
      body = parsed;
    }
    const result = await route.run(archive, url, body);
    logResult("ok");
    sendJson(res, 200, { ok: true, ...result });
  } catch (error) {
    logResult(`failed code=${sendDebugError(res, error)}`);
  }
};

export const handleAdminRequest = async (
  req: IncomingMessage,
  res: ServerResponse,
  options: {
    api: PortfolioAdminApi;
    oauth: ReturnType<typeof createPortfolioAdminOAuth>;
    publicUrl: string;
    oauthResource: string;
    authorizationOrigin: string;
    introspect: (token: string) => Promise<IntrospectedSession>;
    log?: (message: string) => void;
    testSetting?: SettingConnectionTester;
    debugArchive?: ResumeDebugArchiveAdmin;
    appRoot?: string;
  },
): Promise<boolean> => {
  const url = new URL(req.url ?? "/", options.publicUrl);
  const { pathname } = url;
  // 빌드된 React 앱의 위치. 빌드가 dist/auth/app에 만들고 서버는 같은 dist 아래에서 읽는다
  const appRoot = options.appRoot ?? join(__dirname, "app");

  const assetName = pathname.match(
    /^\/admin\/ai-models\/assets\/([A-Za-z0-9._-]+)$/,
  )?.[1];
  if (req.method === "GET" && assetName) {
    const contentType = assetContentTypes[extname(assetName)];
    try {
      if (!contentType) throw new Error("UNSUPPORTED_ASSET");
      const content = readFileSync(join(appRoot, "assets", assetName));
      res.writeHead(200, {
        // 파일 이름에 내용 해시가 들어 있어 바뀌면 이름도 바뀐다
        "cache-control": "public, max-age=31536000, immutable",
        "content-type": contentType,
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
    sendApp(
      res,
      appRoot,
      `'self' ${options.authorizationOrigin} ${identityProviderOrigin}`,
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
      const next = safeReturnPath(url.searchParams.get("next"));
      const stateCookie = Buffer.from(
        JSON.stringify({
          state: authorization.state,
          clientId: authorization.clientId,
          codeVerifier: authorization.codeVerifier,
          redirectUri: authorization.redirectUri,
          resource: authorization.resource,
          ...(next ? { next } : {}),
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
      redirect(res, safeReturnPath(oauthState.next) ?? adminMenuPath, [
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

  // 화면 경로는 공통 메뉴 정의(adminMenu)에서 일괄 등록한다. 경로가 있는 항목만 서빙하므로
  // 준비 중인 항목과 정의에 없는 경로는 여기서 처리하지 않는다
  const isMenuPage =
    pathname === adminMenuPath || pathname === `${adminMenuPath}/`;
  if (
    req.method === "GET" &&
    (isMenuPage || adminPagePaths.includes(pathname))
  ) {
    // 메뉴 화면은 기본 이동지라 next를 싣지 않는다
    const next = isMenuPage
      ? undefined
      : (safeReturnPath(`${pathname}${url.search}`) ?? pathname);
    await serveAuthenticatedApp(req, res, { ...options, appRoot, next });
    return true;
  }

  if (pathname.startsWith(debugApiPrefix)) {
    await handleDebugArchiveApi(req, res, url, options);
    return true;
  }

  if (pathname.startsWith("/admin/ai-models/api/")) {
    const { testSetting } = options;
    const testId = testSetting
      ? pathname.match(/^\/admin\/ai-models\/api\/settings\/(\d+)\/test$/)?.[1]
      : undefined;
    if (testId === undefined && !readApiPath(pathname)) return false;
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
    const apiPath = readApiPath(pathname) ?? "";
    const method = req.method ?? "GET";
    const validMethod =
      testId !== undefined
        ? method === "POST"
        : (apiPath === "/service/resume-model-setting" &&
            ["GET", "POST"].includes(method)) ||
          (apiPath !== "/service/resume-model-setting" &&
            ((apiPath.endsWith("/activate") && method === "POST") ||
              (/^\/service\/resume-model-setting\/\d+$/.test(apiPath) &&
                ["PUT", "DELETE"].includes(method))));
    if (!validMethod) {
      sendJson(res, 405, { ok: false, code: "METHOD_NOT_ALLOWED" });
      return true;
    }
    let session: IntrospectedSession;
    try {
      session = await options.introspect(token);
    } catch {
      sendJson(res, 503, { ok: false, code: "AUTH_UNAVAILABLE" });
      return true;
    }
    if (!session.active) {
      sendJson(res, 401, { ok: false, code: "UNAUTHORIZED" });
      return true;
    }
    if (testId !== undefined && testSetting) {
      const logTest = (environment: string, result: string) =>
        options.log?.(
          `ADMIN_MODEL_TEST sub=${logSubject(session.sub)} id=${testId} environment=${environment} result=${result}`,
        );
      // 요청이 테스트 실행까지 간 경우에만 값이 채워져, 예외도 시도로 기록한다
      let attemptedEnvironment: string | null = null;
      try {
        const environment = parseTestEnvironment(await readBody(req));
        if (!environment) {
          sendJson(res, 400, { ok: false, code: "INVALID_REQUEST" });
          return true;
        }
        attemptedEnvironment = environment;
        const result = await testSetting({ id: Number(testId), environment });
        logTest(environment, logTestResult(result));
        sendJson(res, 200, result);
      } catch (error) {
        const tooLarge =
          error instanceof Error && error.message === "BODY_TOO_LARGE";
        if (attemptedEnvironment) {
          logTest(attemptedEnvironment, "failed code=UPSTREAM_FAILED");
        }
        // 원본 오류에 키나 주소가 섞일 수 있어 코드만 응답한다
        sendJson(res, tooLarge ? 413 : 502, {
          ok: false,
          code: tooLarge ? "BODY_TOO_LARGE" : "UPSTREAM_FAILED",
        });
      }
      return true;
    }
    try {
      const body =
        method === "GET" || method === "DELETE"
          ? undefined
          : await readBody(req);
      const value = await options.api.request(apiPath, {
        method,
        ...(body ? { body } : {}),
      });
      if (mutating) {
        options.log?.(
          `ADMIN_SETTING_CHANGE sub=${logSubject(session.sub)} method=${method} path=${apiPath} result=ok`,
        );
      }
      sendJson(res, 200, value);
    } catch (error) {
      const tooLarge =
        error instanceof Error && error.message === "BODY_TOO_LARGE";
      if (mutating) {
        options.log?.(
          `ADMIN_SETTING_CHANGE sub=${logSubject(session.sub)} method=${method} path=${apiPath} result=failed`,
        );
      }
      // 세션은 위에서 확인했으므로 여기서의 실패는 요청 크기 또는 portfolio-api 쪽 문제다
      sendJson(res, tooLarge ? 413 : 502, {
        ok: false,
        code: tooLarge ? "BODY_TOO_LARGE" : "UPSTREAM_FAILED",
      });
    }
    return true;
  }

  return false;
};
