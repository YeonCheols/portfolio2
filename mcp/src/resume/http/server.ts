import {
  fetchOpenRouterModelText,
  isOpenRouterChatCompletionUrl,
} from "@mcp/resume/connection/openRouterModelConnection";
import {
  fetchResumeModel,
  type ResumeConnectionFetch,
} from "@mcp/resume/connection/resumeConnection";
import { fetchResumeModelText } from "@mcp/resume/connection/resumeModelConnection";
import { createResumeMcpServer } from "@mcp/resume/http/createResumeMcpServer";
import type { ResumeModelClient } from "@mcp/resume/output/runResumeHarness";

export const resumeModelFromEnv = (
  env: { RESUME_MODEL_URL?: string; RESUME_MODEL_TOKEN?: string },
  fetchImpl?: ResumeConnectionFetch,
): ResumeModelClient => ({
  generate: (input) => {
    const url = env.RESUME_MODEL_URL ?? "";
    const token = env.RESUME_MODEL_TOKEN ?? "";
    const options = { url, token, fetchImpl };
    if (isOpenRouterChatCompletionUrl(url)) {
      return fetchOpenRouterModelText(input, options);
    }
    return fetchResumeModelText(input, options);
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
    }),
  }).listen(port);
};

const entry = process.argv[1] ?? "";
if (entry.endsWith("server.ts") || entry.endsWith("server.js")) {
  startResumeMcpServer();
}
