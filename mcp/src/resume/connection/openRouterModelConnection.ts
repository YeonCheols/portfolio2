import {
  ResumeConnectionError,
  type ResumeConnectionOptions,
} from "@mcp/resume/connection/resumeConnection";
import type { ResumeModelCall } from "@mcp/resume/connection/resumeModelConnection";

export const openRouterChatCompletionUrl =
  "https://openrouter.ai/api/v1/chat/completions";

export const isOpenRouterChatCompletionUrl = (url: string) =>
  url.trim() === openRouterChatCompletionUrl;

export const fetchOpenRouterModelText = async (
  input: ResumeModelCall,
  options: ResumeConnectionOptions,
): Promise<string> => {
  if (options.url.trim() === "" || options.token.trim() === "") {
    throw new ResumeConnectionError("MISSING_MODEL_CONNECTION");
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  const response = await fetchImpl(options.url, {
    method: "POST",
    headers: {
      authorization: `Bearer ${options.token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "openrouter/free",
      messages: [
        { role: "system", content: input.persona },
        { role: "user", content: input.prompt },
      ],
    }),
  });
  const payload = (await response.json()) as {
    choices?: { message?: { content?: unknown } }[];
  };
  const content = payload.choices?.[0]?.message?.content;
  if (typeof content !== "string" || content.trim() === "") {
    throw new ResumeConnectionError("MODEL_REJECTED");
  }

  return content;
};
