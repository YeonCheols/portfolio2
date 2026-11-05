import {
  fetchChatCompletionModelResult,
  type ChatCompletionModelOptions,
  type ChatCompletionModelResult,
} from "@mcp/infrastructure/ai/chat-completion-model-connection";
import type { ResumeModelCall } from "@mcp/infrastructure/ai/resume-model-connection";

export type OpenAiModelOptions = ChatCompletionModelOptions;
export type OpenAiModelResult = ChatCompletionModelResult;

export const fetchOpenAiModelResult = (
  input: ResumeModelCall,
  options: OpenAiModelOptions,
): Promise<OpenAiModelResult> => fetchChatCompletionModelResult(input, options);

export const fetchOpenAiModelText = async (
  input: ResumeModelCall,
  options: OpenAiModelOptions,
): Promise<string> => (await fetchOpenAiModelResult(input, options)).text;
