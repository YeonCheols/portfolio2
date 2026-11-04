// 오류 본문은 내부 정보가 섞일 수 있어 읽지 않고 상태 코드만 호출자에게 알린다
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    // 서버가 정해 둔 대문자 코드와 개수만 담는다. 오류 원문은 읽지 않는다
    public readonly code?: string,
    public readonly details: Readonly<Record<string, number>> = {},
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const readErrorCode = async (
  response: Response,
): Promise<{ code?: string; details: Record<string, number> }> => {
  try {
    const body: unknown = await response.json();
    if (typeof body !== "object" || body === null) return { details: {} };
    const { code, removed, remaining } = body as Record<string, unknown>;
    return {
      ...(typeof code === "string" && /^[A-Z_]{1,64}$/.test(code)
        ? { code }
        : {}),
      details: {
        ...(typeof removed === "number" ? { removed } : {}),
        ...(typeof remaining === "number" ? { remaining } : {}),
      },
    };
  } catch {
    return { details: {} };
  }
};

export const request = async (
  path: string,
  init: RequestInit,
): Promise<unknown> => {
  const response = await fetch(path, { credentials: "same-origin", ...init });
  if (response.status === 401) {
    window.location.assign(
      new URL("/admin/ai-models/connect", window.location.origin).toString(),
    );
    throw new ApiError("세션이 만료되었습니다. 다시 로그인해 주세요.", 401);
  }
  if (!response.ok) {
    const { code, details } = await readErrorCode(response);
    throw new ApiError(
      "요청을 처리하지 못했습니다. 다시 시도해 주세요.",
      response.status,
      code,
      details,
    );
  }
  if (response.status === 204) return null;
  return response.json();
};
