import * as Sentry from "@sentry/nextjs";

// 에러 캡처
export const captureError = (error: Error, context?: Record<string, any>) => {
  try {
    Sentry.captureException(error, {
      contexts: context ? { custom: context } : undefined,
    });
  } catch (sentryError) {
    console.error("Sentry.captureException failed:", sentryError);
  }
};

// 메시지 캡처
export const captureMessage = (
  message: string,
  level: Sentry.SeverityLevel = "error", // 기본값을 error로 변경
) => {
  try {
    const result = Sentry.captureMessage(message, level);
  } catch (sentryError) {
    console.error("Sentry.captureMessage failed:", sentryError);
  }
};

// 사용자 정보 설정
export const setUser = (user: {
  id?: string;
  email?: string;
  username?: string;
}) => {
  Sentry.setUser(user);
};

// 태그 설정
export const setTag = (key: string, value: string) => {
  Sentry.setTag(key, value);
};

// 컨텍스트 설정
export const setContext = (name: string, context: Record<string, any>) => {
  Sentry.setContext(name, context);
};

// 성능 모니터링을 위한 트랜잭션 시작
export const startTransaction = (name: string, operation: string) => {
  // Sentry 트랜잭션은 현재 버전에서 다르게 처리됨
  return null;
};

// 커스텀 이벤트 캡처
export const captureEvent = (event: Sentry.Event) => {
  Sentry.captureEvent(event);
};

// API 에러 핸들러
export const handleApiError = (error: any, endpoint?: string) => {
  captureError(error instanceof Error ? error : new Error(String(error)), {
    endpoint,
    type: "api_error",
  });
};

// React 에러 핸들러
export const handleReactError = (error: Error, errorInfo: React.ErrorInfo) => {
  captureError(error, {
    componentStack: errorInfo.componentStack,
    type: "react_error",
  });
};
