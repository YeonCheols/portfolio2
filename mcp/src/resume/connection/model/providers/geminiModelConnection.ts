import {
  fetchChatCompletionModelResult,
  type ChatCompletionModelOptions,
  type ChatCompletionModelResult,
} from "@mcp/resume/connection/model/chatCompletionModelConnection";
import type { ResumeModelCall } from "@mcp/resume/connection/model/resumeModelConnection";

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
