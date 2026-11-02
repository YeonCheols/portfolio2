import {
  ResumeConnectionError,
  type ResumeConnectionFetch,
} from "@mcp/resume/connection/resumeConnection";

export type ResumeModelSetting = {
  provider: string;
  modelName: string;
  url: string;
  secretRef: string;
};

export type ResumeModelSettingOptions = {
  url: string;
  token: string;
  environment: string;
  fetchImpl?: ResumeConnectionFetch;
};

const isFilled = (value: unknown): value is string =>
  typeof value === "string" && value.trim() !== "";

const isHttpsUrl = (value: string): boolean => {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
};

// 계약 밖 필드는 버리고 네 필드만 신뢰한다. 모델 호출 전에 걸러야 잘못된 설정으로 토큰이 나가지 않는다
const parseResumeModelSetting = (payload: unknown): ResumeModelSetting => {
  const body = (
    typeof payload === "object" && payload !== null ? payload : {}
  ) as Record<string, unknown>;
  const { provider, modelName, url, secretRef } = body;
  if (
    !isFilled(provider) ||
    !isFilled(modelName) ||
    !isFilled(url) ||
    !isFilled(secretRef) ||
    !isHttpsUrl(url)
  ) {
    throw new ResumeConnectionError("MODEL_SETTING_INVALID");
  }

  return { provider, modelName, url, secretRef };
};

export const fetchActiveResumeModelSetting = async (
  options: ResumeModelSettingOptions,
): Promise<ResumeModelSetting> => {
  const fetchImpl = options.fetchImpl ?? fetch;
  let response: Awaited<ReturnType<ResumeConnectionFetch>>;
  try {
    response = await fetchImpl(
      `${options.url}?environment=${encodeURIComponent(options.environment)}`,
      {
        method: "GET",
        headers: { authorization: `Bearer ${options.token}` },
      },
    );
  } catch {
    // 원본 오류 메시지에 주소나 헤더가 섞일 수 있어 코드만 전달한다
    throw new ResumeConnectionError("MODEL_SETTING_UNAVAILABLE");
  }
  if (response.status === 404) {
    throw new ResumeConnectionError("MODEL_SETTING_NOT_FOUND");
  }
  // 조회가 거부되면 시작 때의 환경변수 설정 등으로 대체하지 않고 실패시킨다
  if (response.ok !== true) {
    throw new ResumeConnectionError("MODEL_SETTING_REJECTED");
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new ResumeConnectionError("MODEL_SETTING_INVALID");
  }

  return parseResumeModelSetting(payload);
};
