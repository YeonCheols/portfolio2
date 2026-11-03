import {
  ResumeConnectionError,
  type ResumeConnectionOptions,
} from "@mcp/resume/connection/resumeConnection";
import type { ResumeModelCall } from "@mcp/resume/connection/resumeModelConnection";

export type OpenRouterModelOptions = ResumeConnectionOptions & {
  model?: string;
};

// 연결 테스트가 공급자 응답 원문을 보여줄 수 있도록 문장과 원문을 함께 돌려준다
export type OpenRouterModelResult = { text: string; raw: unknown };

// 상태 코드로 원인을 나눠, 키 문제와 공급자 쪽 문제를 사용자가 구분하게 한다. 공급자의 오류 본문은 읽지 않는다
const failureCode = (status: number | undefined): string => {
  if (status === 401 || status === 403) return "MODEL_AUTH_FAILED";
  if (status === 429 || (status !== undefined && status >= 500)) {
    return "MODEL_PROVIDER_ERROR";
  }
  return "MODEL_REJECTED";
};

export const fetchOpenRouterModelResult = async (
  input: ResumeModelCall,
  options: OpenRouterModelOptions,
): Promise<OpenRouterModelResult> => {
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
            provider: { require_parameters: true },
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
  let payload: { choices?: { message?: { content?: unknown } }[] };
  try {
    payload = (await response.json()) as {
      choices?: { message?: { content?: unknown } }[];
    };
  } catch (error) {
    if (error instanceof ResumeConnectionError) throw error;
    throw new ResumeConnectionError("MODEL_REJECTED");
  }
  const content = payload.choices?.[0]?.message?.content;
  if (typeof content !== "string" || content.trim() === "") {
    throw new ResumeConnectionError("MODEL_REJECTED");
  }

  return { text: content, raw: payload };
};

export const fetchOpenRouterModelText = async (
  input: ResumeModelCall,
  options: OpenRouterModelOptions,
): Promise<string> => (await fetchOpenRouterModelResult(input, options)).text;
