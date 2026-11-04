import {
  fetchChatCompletionModelResult,
  type ChatCompletionModelOptions,
  type ChatCompletionModelResult,
} from "@mcp/resume/connection/model/chatCompletionModelConnection";
import type { ResumeModelCall } from "@mcp/resume/connection/model/resumeModelConnection";

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
