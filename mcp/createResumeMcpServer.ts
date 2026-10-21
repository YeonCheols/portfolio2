import http, { type IncomingMessage, type ServerResponse } from "http";

import { handleMcpRequest } from "./handleMcpRequest";
import type { ResumeConnection } from "./resumeTools";

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

const wantsEventStream = (req: IncomingMessage): boolean =>
  req.headers.accept?.includes("text/event-stream") ?? false;

const sendMcp = (
  req: IncomingMessage,
  res: ServerResponse,
  body: unknown,
): void => {
  if (!wantsEventStream(req)) {
    sendJson(res, 200, body);
    return;
  }

  res.writeHead(200, {
    "content-type": "text/event-stream",
    "cache-control": "no-cache",
  });
  res.end(`event: message\ndata: ${JSON.stringify(body)}\n\n`);
};

export const createResumeMcpServer = (options: {
  token: string;
  connection: ResumeConnection;
  log?: (message: string) => void;
}) =>
  http.createServer(async (req, res) => {
    const url = req.url?.split("?")[0];

    if (req.method === "GET" && url === "/health") {
      sendJson(res, 200, { ok: true });
      return;
    }

    if (req.method === "GET" && url === "/mcp") {
      res.writeHead(405, { allow: "POST" });
      res.end();
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
      );
      if (response === null) {
        res.writeHead(202);
        res.end();
        return;
      }
      sendMcp(req, res, response);
    } catch {
      options.log?.("INVALID_INPUT");
      sendJson(res, 400, { ok: false, code: "INVALID_INPUT" });
    }
  });
