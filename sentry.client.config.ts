import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://08576d88aebeda410dc91d2c30bed552@o4509861995085824.ingest.us.sentry.io/4509861995937792",
  tracesSampleRate: 1.0, // 성능 트레이싱 활성화
  debug: true, // 항상 디버그 활성화
  replaysOnErrorSampleRate: 0.0, // 세션 리플레이 비활성화
  replaysSessionSampleRate: 0.0, // 세션 리플레이 비활성화
  // 로그 수집 활성화
  attachStacktrace: true, // 스택 트레이스 첨부
  includeLocalVariables: true, // 로컬 변수 포함
  // 로그 레벨 설정 (현재 버전에서 지원되지 않는 옵션)
  // minBreadcrumbLevel: "debug", // 최소 브레드크럼 레벨
  // 세션 추적 비활성화 (요청 수 줄이기)
  // autoSessionTracking: false, // 이 옵션은 현재 버전에서 지원되지 않음
  // 더 자세한 로그
  beforeSend(event) {
    // 로그 메시지만 필터링
    if (event.type === "message") {
      console.info("Log message detected:", event.message);
      console.info("Log level:", event.level);
    }

    // 모든 이벤트를 전송 (필터링 없음)
    return event;
  },
  // 초기화 완료 로그
  beforeBreadcrumb(breadcrumb) {
    console.log("Sentry Breadcrumb:", breadcrumb);
    return breadcrumb;
  },
});
