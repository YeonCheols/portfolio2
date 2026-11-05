import {
  fetchChatCompletionModelResult,
  type ChatCompletionModelOptions,
  type ChatCompletionModelResult,
} from "@mcp/infrastructure/ai/chat-completion-model-connection";
import type { ResumeModelCall } from "@mcp/infrastructure/ai/resume-model-connection";

export type OpenRouterModelOptions = ChatCompletionModelOptions;
export type OpenRouterModelResult = ChatCompletionModelResult;

export const fetchOpenRouterModelResult = (
  input: ResumeModelCall,
  options: OpenRouterModelOptions,
): Promise<OpenRouterModelResult> =>
  fetchChatCompletionModelResult(input, options, {
    provider: { require_parameters: true },
  });

export const fetchOpenRouterModelText = async (
  input: ResumeModelCall,
  options: OpenRouterModelOptions,
): Promise<string> => (await fetchOpenRouterModelResult(input, options)).text;
