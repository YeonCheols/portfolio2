import http, { type IncomingMessage, type ServerResponse } from "http";
import type { JsonStorage } from "@mcp/infrastructure/storage/supabase-storage";

import type { PortfolioAdminApi } from "@mcp/infrastructure/portfolio-api/admin-api";
import type { createPortfolioAdminOAuth } from "@mcp/interfaces/admin/auth/admin-oauth";
import { handleAdminRequest } from "@mcp/interfaces/admin/http/admin-routes";
import type { ResumeDebugArchiveAdmin } from "@mcp/modules/resume/archive/resume-debug-archive-admin";
import type { SettingConnectionTester } from "@mcp/modules/ai-models/setting-connection-test";
import type { IntrospectedSession } from "@mcp/infrastructure/portfolio-api/portfolio-api-introspector";
import { createResumeGenerationStore } from "@mcp/modules/resume/generation/resume-generation-store";

import type { ResumeModelClient } from "@mcp/modules/resume/generation/run-resume-harness";
import { handleMcpRequest } from "@mcp/interfaces/tools/handle-mcp-request";
import type { ResumeConnection } from "@mcp/interfaces/tools/resume/resume-tools";

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
  introspect: (token: string) => Promise<boolean | IntrospectedSession>;
  environment?: string;
  protectedResourceMetadata?: {
    resource: string;
    authorization_servers: string[];
    scopes_supported?: string[];
    bearer_methods_supported?: string[];
  };
  connection: ResumeConnection;
  model?: ResumeModelSource;
  storage?: JsonStorage;
  admin?: {
    api: PortfolioAdminApi;
    oauth: ReturnType<typeof createPortfolioAdminOAuth>;
    publicUrl: string;
    oauthResource: string;
    authorizationOrigin: string;
    introspect: (token: string) => Promise<IntrospectedSession>;
    testSetting?: SettingConnectionTester;
    debugArchive?: ResumeDebugArchiveAdmin;
  };
  log?: (message: string) => void;
}) => {
  const generations = createResumeGenerationStore();
  return http.createServer(async (req, res) => {
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
    let session: boolean | IntrospectedSession = false;
    try {
      session = token ? await options.introspect(token) : false;
    } catch {
      options.log?.("AUTH_INTROSPECTION_UNAVAILABLE");
      sendJson(res, 503, { ok: false, code: "AUTH_UNAVAILABLE" });
      return;
    }

    if (!(typeof session === "boolean" ? session : session.active === true)) {
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
      const parsed = JSON.parse(raw);
      const needsModel =
        parsed.method === "tools/call" &&
        parsed.params?.name === "generate_resume" &&
        parsed.params?.arguments?.generationId === undefined &&
        parsed.params?.arguments?.claims === undefined;
      const response = await handleMcpRequest(
        parsed,
        options.connection,
        needsModel
          ? typeof options.model === "function"
            ? options.model()
            : options.model
          : undefined,
        typeof session === "object" &&
          session.sub?.trim() &&
          options.environment?.trim()
          ? {
              store: generations,
              scope: { subject: session.sub, environment: options.environment },
              storage: options.storage,
            }
          : undefined,
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
};
