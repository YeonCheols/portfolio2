import type { ResumeModel } from "@mcp/resume/model/resumeModel";

export class ResumeConnectionError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = "ResumeConnectionError";
  }
}

export type ResumeConnectionInput = {
  source: "repository" | "embedded" | "file";
  xml?: string;
};

export type ResumeConnectionFetch = (
  url: string,
  init: RequestInit,
) => Promise<{ json: () => Promise<unknown> }>;

export type ResumeConnectionOptions = {
  url: string;
  token: string;
  fetchImpl?: ResumeConnectionFetch;
};

export const postResumeConnection = async <T extends Record<string, unknown>>(
  options: ResumeConnectionOptions,
  body: unknown,
): Promise<{ ok: true } & T> => {
  const fetchImpl = options.fetchImpl ?? fetch;
  const response = await fetchImpl(options.url, {
    method: "POST",
    headers: {
      authorization: `Bearer ${options.token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const payload = (await response.json()) as
    | ({ ok: true } & T)
    | { ok: false; code: string };
  if (!payload.ok) throw new ResumeConnectionError(payload.code);

  return payload;
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
