import type { ResumeModel } from "@mcp/modules/resume/model/resume-model";
import {
  postResumeConnection,
  type ResumeConnectionOptions,
} from "@mcp/infrastructure/connection/connection";

export type ResumeConnectionInput = {
  source: "repository" | "embedded" | "file";
  xml?: string;
};

export const fetchResumeModel = async (
  input: ResumeConnectionInput,
  options: ResumeConnectionOptions,
): Promise<ResumeModel> => {
  const payload = await postResumeConnection<{ model: ResumeModel }>(options, {
    source: input.source,
    xml: input.xml,
  });

  return payload.model;
};
