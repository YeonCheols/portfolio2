import {
  fetchChatCompletionModelResult,
  type ChatCompletionModelOptions,
  type ChatCompletionModelResult,
} from "@mcp/infrastructure/ai/chat-completion-model-connection";
import type { ResumeModelCall } from "@mcp/infrastructure/ai/resume-model-connection";

export type GeminiModelOptions = ChatCompletionModelOptions;
export type GeminiModelResult = ChatCompletionModelResult;

export const fetchGeminiModelResult = (
  input: ResumeModelCall,
  options: GeminiModelOptions,
): Promise<GeminiModelResult> => fetchChatCompletionModelResult(input, options);

export const fetchGeminiModelText = async (
  input: ResumeModelCall,
  options: GeminiModelOptions,
): Promise<string> => (await fetchGeminiModelResult(input, options)).text;
