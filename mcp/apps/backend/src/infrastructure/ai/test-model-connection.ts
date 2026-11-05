import type {
  ChatCompletionModelOptions,
  ChatCompletionModelResult,
} from "@mcp/infrastructure/ai/chat-completion-model-connection";
import type {
  ResumeJsonSchemaResponseFormat,
  ResumeModelCall,
} from "@mcp/infrastructure/ai/resume-model-connection";
import type { ResumeModelSetting } from "@mcp/infrastructure/portfolio-api/resume-model-setting";
import {
  ResumeConnectionError,
  type ResumeConnectionFetch,
} from "@mcp/infrastructure/connection/connection";

export type ModelConnect = (
  input: ResumeModelCall,
  options: ChatCompletionModelOptions,
) => Promise<ChatCompletionModelResult>;

export type StructuredCheck =
  | { ok: true; latencyMs: number; response: unknown }
  | { ok: false; code: string; response?: unknown };

export type ModelConnectionTestResult =
  | {
      ok: true;
      latencyMs: number;
      response: unknown;
      structured: StructuredCheck;
    }
  | { ok: false; code: string };

export type ModelConnectionTestOptions = {
  connections: Record<string, ModelConnect>;
  fetchImpl?: ResumeConnectionFetch;
  timeoutMs?: number;
  now?: () => number;
};

const defaultTimeoutMs = 15_000;

// 실제 이력서나 개인정보를 보내지 않도록 고정된 최소 입력만 쓴다
const testPersona = "연결 테스트입니다. 이력서 내용은 없습니다.";
const testPrompt = "ok 라고만 답하세요.";
const structuredPrompt = 'status 필드에 "ok"를 담은 JSON으로 답하세요.';
const structuredResponseFormat: ResumeJsonSchemaResponseFormat = {
  type: "json_schema",
  json_schema: {
    name: "connection_test",
    strict: true,
    schema: {
      type: "object",
      properties: { status: { type: "string" } },
      required: ["status"],
      additionalProperties: false,
    },
  },
};

type CallOutcome =
  | { ok: true; result: ChatCompletionModelResult; latencyMs: number }
  | { ok: false; code: string };

export const testModelConnection = async (
  setting: ResumeModelSetting,
  options: ModelConnectionTestOptions,
): Promise<ModelConnectionTestResult> => {
  // 키를 보내기 전에 공급자부터 확인해, 알 수 없는 공급자로 요청이 나가지 않게 한다
  if (!Object.hasOwn(options.connections, setting.provider)) {
    return { ok: false, code: "MISSING_MODEL_CONNECTION" };
  }
  const connect = options.connections[setting.provider]!;
  const now = options.now ?? Date.now;

  // 호출마다 자기 제한 시간을 가져, 한 호출의 지연이 다음 호출의 시간을 줄이지 않는다
  const call = async (input: ResumeModelCall): Promise<CallOutcome> => {
    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, options.timeoutMs ?? defaultTimeoutMs);
    const startedAt = now();
    try {
      const result = await connect(input, {
        url: setting.url,
        token: setting.apiKey,
        model: setting.modelName,
        // 요청이 실제로 나갈 때 전역 fetch를 찾아, 연결이 fetch 없이 끝나는 경로에서는 쓰지 않는다
        fetchImpl: (url, init) =>
          (options.fetchImpl ?? fetch)(url, {
            ...init,
            signal: controller.signal,
          }),
      });
      return { ok: true, result, latencyMs: now() - startedAt };
    } catch (error) {
      if (timedOut) return { ok: false, code: "MODEL_TIMEOUT" };
      // 원본 오류 메시지에 키나 주소가 섞일 수 있어 코드만 전달한다
      return {
        ok: false,
        code:
          error instanceof ResumeConnectionError
            ? error.code
            : "MODEL_UNAVAILABLE",
      };
    } finally {
      clearTimeout(timer);
    }
  };

  const basic = await call({ persona: testPersona, prompt: testPrompt });
  if (!basic.ok) return basic;

  // 이력서 생성의 의미 검증이 쓰는 json_schema 형식을 같은 고정 입력으로 한 번 더 확인한다
  const structuredCall = await call({
    persona: testPersona,
    prompt: structuredPrompt,
    responseFormat: structuredResponseFormat,
  });

  const safe = (raw: unknown) => safeResponse(raw, setting.apiKey);

  return {
    ok: true,
    latencyMs: basic.latencyMs,
    response: safe(basic.result.raw),
    structured: toStructuredCheck(structuredCall, safe),
  };
};

const maxResponseChars = 8_000;
const previewChars = 2_000;

// 브라우저로 나가는 응답 원문이다. 공급자가 요청 값을 되돌려줘도 키가 나가지 않게 가리고, 크기를 제한한다
const safeResponse = (raw: unknown, apiKey: string): unknown => {
  const json = JSON.stringify(raw);
  if (json === undefined) return raw;
  // 빈 키로 나누면 글자 사이마다 치환되어 응답이 깨지므로 키가 있을 때만 가린다
  const cleaned = apiKey ? json.split(apiKey).join("[REDACTED]") : json;
  if (cleaned.length > maxResponseChars) {
    return { truncated: true, preview: cleaned.slice(0, previewChars) };
  }
  return JSON.parse(cleaned) as unknown;
};

// 지원한다고 응답해도 약속한 모양이 아니면 이력서 생성에서 쓸 수 없으므로 성공으로 보지 않는다
const toStructuredCheck = (
  outcome: CallOutcome,
  safe: (raw: unknown) => unknown,
): StructuredCheck => {
  if (!outcome.ok) return { ok: false, code: outcome.code };
  const response = safe(outcome.result.raw);
  if (!hasStatusField(outcome.result.text)) {
    return { ok: false, code: "STRUCTURED_INVALID", response };
  }
  return { ok: true, latencyMs: outcome.latencyMs, response };
};

const hasStatusField = (text: string): boolean => {
  try {
    const value = JSON.parse(text) as { status?: unknown } | null;
    return typeof value?.status === "string";
  } catch {
    return false;
  }
};
