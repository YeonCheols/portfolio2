import { fetchOpenRouterModelText } from "@mcp/resume/connection/openRouterModelConnection";
import {
  fetchResumeModel,
  ResumeConnectionError,
  type ResumeConnectionFetch,
} from "@mcp/resume/connection/resumeConnection";
import { fetchResumeModelText } from "@mcp/resume/connection/resumeModelConnection";
import { createResumeMcpServer } from "@mcp/resume/http/createResumeMcpServer";
import type { ResumeModelClient } from "@mcp/resume/output/runResumeHarness";

const resumeModelConnections = {
  openrouter: fetchOpenRouterModelText,
} as const;

export type ResumeModelEnv = {
  RESUME_MODEL_URL?: string;
  RESUME_MODEL_TOKEN?: string;
  RESUME_MODEL_PROVIDER?: string;
  RESUME_MODEL_NAME?: string;
};

export const resumeModelFromEnv = (
  env: ResumeModelEnv,
  fetchImpl?: ResumeConnectionFetch,
): ResumeModelClient => ({
  generate: (input) => {
    const url = env.RESUME_MODEL_URL ?? "";
    const token = env.RESUME_MODEL_TOKEN ?? "";
    const provider = env.RESUME_MODEL_PROVIDER?.trim() ?? "";
    if (provider === "") {
      return fetchResumeModelText(input, { url, token, fetchImpl });
    }
    const connect =
      resumeModelConnections[provider as keyof typeof resumeModelConnections];
    if (!connect) {
      return Promise.reject(
        new ResumeConnectionError("MISSING_MODEL_CONNECTION"),
      );
    }
    return connect(input, {
      url,
      token,
      fetchImpl,
      model: env.RESUME_MODEL_NAME?.trim() ?? "",
    });
  },
});

export const startResumeMcpServer = () => {
  const token = process.env.MCP_AUTH_TOKEN ?? "";
  const resumeUrl = process.env.RESUME_CONNECTION_URL ?? "";
  const resumeToken = process.env.RESUME_CONNECTION_TOKEN ?? "";

  if (resumeUrl === "" || resumeToken === "") {
    throw new Error(
      "RESUME_CONNECTION_URL and RESUME_CONNECTION_TOKEN are required",
    );
  }

  const port = Number(process.env.PORT ?? 8080);

  return createResumeMcpServer({
    token,
    connection: {
      load: (input) =>
        fetchResumeModel(input, { url: resumeUrl, token: resumeToken }),
    },
    model: resumeModelFromEnv({
      RESUME_MODEL_URL: process.env.RESUME_MODEL_URL,
      RESUME_MODEL_TOKEN: process.env.RESUME_MODEL_TOKEN,
      RESUME_MODEL_PROVIDER: process.env.RESUME_MODEL_PROVIDER,
      RESUME_MODEL_NAME: process.env.RESUME_MODEL_NAME,
    }),
  }).listen(port);
};

const entry = process.argv[1] ?? "";
if (entry.endsWith("server.ts") || entry.endsWith("server.js")) {
  startResumeMcpServer();
}
