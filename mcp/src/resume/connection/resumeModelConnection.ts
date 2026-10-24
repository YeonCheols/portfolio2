import {
  ResumeConnectionError,
  postResumeConnection,
  type ResumeConnectionOptions,
} from "@mcp/resume/connection/resumeConnection";

export type ResumeModelCall = {
  persona: string;
  prompt: string;
};

export const fetchResumeModelText = async (
  input: ResumeModelCall,
  options: ResumeConnectionOptions,
): Promise<string> => {
  if (options.url.trim() === "" || options.token.trim() === "") {
    throw new ResumeConnectionError("MISSING_MODEL_CONNECTION");
  }

  const payload = await postResumeConnection<{ text: string }>(options, {
    persona: input.persona,
    prompt: input.prompt,
  });

  return payload.text;
};
