// 오류 본문은 내부 정보가 섞일 수 있어 읽지 않고 상태 코드만 호출자에게 알린다
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

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
    throw new ApiError(
      "요청을 처리하지 못했습니다. 다시 시도해 주세요.",
      response.status,
    );
  }
  if (response.status === 204) return null;
  return response.json();
};
