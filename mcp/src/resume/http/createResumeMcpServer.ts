import http, { type IncomingMessage, type ServerResponse } from "http";

import type { ResumeModelClient } from "@mcp/resume/output/runResumeHarness";
import { handleMcpRequest } from "@mcp/resume/tools/handleMcpRequest";
import type { ResumeConnection } from "@mcp/resume/tools/resumeTools";

const readBody = (req: IncomingMessage): Promise<string> =>
  new Promise((resolve, reject) => {
    const chunks: string[] = [];
    req.setEncoding("utf8");
    req.on("data", (chunk: string) => chunks.push(chunk));
    req.on("end", () => resolve(chunks.join("")));
    req.on("error", reject);
  });

const sendJson = (res: ServerResponse, status: number, body: unknown): void => {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
};

// 팩토리를 주면 MCP 요청마다 새 클라이언트를 만들어, 한 요청의 모델 호출이 같은 설정 스냅샷을 쓰게 한다
export type ResumeModelSource = ResumeModelClient | (() => ResumeModelClient);

export const createResumeMcpServer = (options: {
  token: string;
  connection: ResumeConnection;
  model?: ResumeModelSource;
  log?: (message: string) => void;
}) =>
  http.createServer(async (req, res) => {
    const url = req.url?.split("?")[0];

    if (req.method === "GET" && url === "/health") {
      sendJson(res, 200, { ok: true });
      return;
    }

    if (req.method !== "POST" || url !== "/mcp") {
      res.writeHead(404);
      res.end();
      return;
    }

    const raw = await readBody(req);
    const authorized =
      options.token !== "" &&
      req.headers.authorization === `Bearer ${options.token}`;

    if (!authorized) {
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
