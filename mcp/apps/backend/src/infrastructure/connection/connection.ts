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
  let payload: ({ ok: true } & T) | { ok?: false; code?: unknown };
  try {
    payload = (await response.json()) as typeof payload;
  } catch {
    // JSON이 아닌 응답은 본문을 오류에 싣지 않는다
    throw new ResumeConnectionError("CONNECTION_FAILED");
  }
  if (!payload.ok) {
    // 연결 주소가 틀리면 ok·code가 없는 본문이 오므로 코드가 없을 때도 응답 항목이 깨지지 않게 고정 코드를 쓴다
    const code = "code" in payload ? payload.code : undefined;
    throw new ResumeConnectionError(
      typeof code === "string" && /^[A-Z_]{1,64}$/.test(code)
        ? code
        : "CONNECTION_FAILED",
    );
  }

  return payload;
};
