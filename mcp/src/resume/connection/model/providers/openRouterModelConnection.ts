import {
  fetchChatCompletionModelResult,
  type ChatCompletionModelOptions,
  type ChatCompletionModelResult,
} from "@mcp/resume/connection/model/chatCompletionModelConnection";
import type { ResumeModelCall } from "@mcp/resume/connection/model/resumeModelConnection";

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
