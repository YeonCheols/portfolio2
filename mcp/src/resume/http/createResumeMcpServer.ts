import http, { type IncomingMessage, type ServerResponse } from "http";

import type { PortfolioAdminApi } from "@mcp/auth/adminApi";
import type { createPortfolioAdminOAuth } from "@mcp/auth/adminOAuth";
import { handleAdminRequest } from "@mcp/auth/adminRoutes";
import type { SettingConnectionTester } from "@mcp/auth/settingConnectionTest";
import type { IntrospectedSession } from "@mcp/resume/http/portfolioApiIntrospector";

import type { ResumeModelClient } from "@mcp/resume/output/runResumeHarness";
import { handleMcpRequest } from "@mcp/resume/tools/handleMcpRequest";
import type { ResumeConnection } from "@mcp/resume/tools/resumeTools";

const readBody = (req: IncomingMessage): Promise<string> =>
  new Promise((resolve, reject) => {
    const chunks: string[] = [];
    let size = 0;
    let oversized = false;
    req.setEncoding("utf8");
    req.on("data", (chunk: string) => {
      if (oversized) return;
      size += Buffer.byteLength(chunk);
      if (size > 1024 * 1024) {
        oversized = true;
        reject(new Error("BODY_TOO_LARGE"));
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      if (!oversized) resolve(chunks.join(""));
    });
    req.on("error", (error) => {
      if (!oversized) reject(error);
    });
  });

const sendJson = (res: ServerResponse, status: number, body: unknown): void => {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
};

// 팩토리를 주면 MCP 요청마다 새 클라이언트를 만들어, 한 요청의 모델 호출이 같은 설정 스냅샷을 쓰게 한다
export type ResumeModelSource = ResumeModelClient | (() => ResumeModelClient);

export const createResumeMcpServer = (options: {
  introspect: (token: string) => Promise<boolean>;
  protectedResourceMetadata?: {
    resource: string;
    authorization_servers: string[];
    scopes_supported?: string[];
    bearer_methods_supported?: string[];
  };
  connection: ResumeConnection;
  model?: ResumeModelSource;
  admin?: {
    api: PortfolioAdminApi;
    oauth: ReturnType<typeof createPortfolioAdminOAuth>;
    publicUrl: string;
    oauthResource: string;
    authorizationOrigin: string;
    introspect: (token: string) => Promise<IntrospectedSession>;
    testSetting?: SettingConnectionTester;
  };
  log?: (message: string) => void;
}) =>
  http.createServer(async (req, res) => {
    if (
      options.admin &&
      (await handleAdminRequest(req, res, {
        ...options.admin,
        log: options.log,
      }))
    ) {
      return;
    }
    const url = req.url?.split("?")[0];

    if (req.method === "GET" && url === "/health") {
      sendJson(res, 200, { ok: true });
      return;
    }

    if (
      req.method === "GET" &&
      (url === "/.well-known/oauth-protected-resource/mcp" ||
        url === "/.well-known/oauth-protected-resource")
    ) {
      if (!options.protectedResourceMetadata) {
        res.writeHead(404);
        res.end();
        return;
      }
      sendJson(res, 200, options.protectedResourceMetadata);
      return;
    }

    if (req.method !== "POST" || url !== "/mcp") {
      res.writeHead(404);
      res.end();
      return;
    }

    let raw: string;
    try {
      raw = await readBody(req);
    } catch (error) {
      const tooLarge =
        error instanceof Error && error.message === "BODY_TOO_LARGE";
      sendJson(res, tooLarge ? 413 : 400, {
        ok: false,
        code: tooLarge ? "BODY_TOO_LARGE" : "INVALID_INPUT",
      });
      return;
    }
    const authorization = req.headers.authorization;
    const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
    let authorized = false;
    try {
      authorized = Boolean(token) && (await options.introspect(token!));
    } catch {
      options.log?.("AUTH_INTROSPECTION_UNAVAILABLE");
      sendJson(res, 503, { ok: false, code: "AUTH_UNAVAILABLE" });
      return;
    }

    if (!authorized) {
      const resourceMetadataUrl = options.protectedResourceMetadata
        ? new URL(
            "/.well-known/oauth-protected-resource/mcp",
            options.protectedResourceMetadata.resource,
          ).toString()
        : undefined;
      res.setHeader(
        "www-authenticate",
        resourceMetadataUrl
          ? `Bearer resource_metadata="${resourceMetadataUrl}"`
          : "Bearer",
      );
      sendJson(res, 401, { ok: false, code: "UNAUTHORIZED" });
      return;
    }

    try {
      const response = await handleMcpRequest(
        JSON.parse(raw),
        options.connection,
        typeof options.model === "function" ? options.model() : options.model,
      );
      if (response === null) {
        res.writeHead(202);
        res.end();
        return;
      }
      sendJson(res, 200, response);
    } catch {
      options.log?.("INVALID_INPUT");
      sendJson(res, 400, { ok: false, code: "INVALID_INPUT" });
    }
  });
