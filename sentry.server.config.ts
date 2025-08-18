import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1.0,
  debug: process.env.NODE_ENV === "development", // 개발 환경에서 디버그 활성화
  // 개발 환경에서 더 자세한 로그
  beforeSend(event) {
    if (process.env.NODE_ENV === "development") {
      console.info("Sentry Server Event:", event);
    }
    return event;
  },
});
