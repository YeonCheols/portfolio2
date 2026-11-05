import type { ResumeModelCall } from "@mcp/infrastructure/ai/resume-model-connection";
import {
  ResumeConnectionError,
  type ResumeConnectionOptions,
} from "@mcp/infrastructure/connection/connection";

export type ChatCompletionModelOptions = ResumeConnectionOptions & {
  model?: string;
};

// 연결 테스트가 공급자 응답 원문을 보여줄 수 있도록 문장과 원문을 함께 돌려준다
export type ChatCompletionModelResult = { text: string; raw: unknown };

// 상태 코드로 원인을 나눠, 키 문제와 공급자 쪽 문제를 사용자가 구분하게 한다. 공급자의 오류 본문은 읽지 않는다
const failureCode = (status: number | undefined): string => {
  if (status === 401 || status === 403) return "MODEL_AUTH_FAILED";
  if (status === 429 || (status !== undefined && status >= 500)) {
    return "MODEL_PROVIDER_ERROR";
  }
  return "MODEL_REJECTED";
};

export const fetchChatCompletionModelResult = async (
  input: ResumeModelCall,
  options: ChatCompletionModelOptions,
  structuredParameters: Record<string, unknown> = {},
): Promise<ChatCompletionModelResult> => {
  const model = (options.model ?? "").trim();
  if (
    options.url.trim() === "" ||
    options.token.trim() === "" ||
    model === ""
  ) {
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
      model,
      ...(input.responseFormat
        ? {
            ...structuredParameters,
            response_format: input.responseFormat,
          }
        : {}),
      messages: [
        { role: "system", content: input.persona },
        { role: "user", content: input.prompt },
      ],
    }),
  });
  if (response.ok !== true) {
    throw new ResumeConnectionError(failureCode(response.status));
  }
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new ResumeConnectionError("MODEL_REJECTED");
  }
  const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null;
  const firstChoice =
    isRecord(payload) && Array.isArray(payload.choices)
      ? payload.choices[0]
      : undefined;
  const message = isRecord(firstChoice) ? firstChoice.message : undefined;
  const content = isRecord(message) ? message.content : undefined;
  if (typeof content !== "string" || content.trim() === "") {
    throw new ResumeConnectionError("MODEL_REJECTED");
  }

  return { text: content, raw: payload };
};
