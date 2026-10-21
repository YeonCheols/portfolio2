import type { ResumeModel } from "./resumeModel";

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

type FetchLike = (
  url: string,
  init: RequestInit,
) => Promise<{ json: () => Promise<unknown> }>;

export const fetchResumeModel = async (
  input: ResumeConnectionInput,
  options: {
    url: string;
    token: string;
    fetchImpl?: FetchLike;
  },
): Promise<ResumeModel> => {
  const fetchImpl = options.fetchImpl ?? fetch;
  const response = await fetchImpl(options.url, {
    method: "POST",
    headers: {
      authorization: `Bearer ${options.token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      source: input.source,
      xml: input.xml,
    }),
  });
  const body = (await response.json()) as
    | { ok: true; model: ResumeModel }
    | { ok: false; code: string };
  if (!body.ok) throw new ResumeConnectionError(body.code);

  return body.model;
};
