export class ResumeConnectionError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = "ResumeConnectionError";
  }
}

export type ResumeConnectionFetch = (
  url: string,
  init: RequestInit,
) => Promise<{
  ok?: boolean;
  status?: number;
  json: () => Promise<unknown>;
  text?: () => Promise<string>;
}>;

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
