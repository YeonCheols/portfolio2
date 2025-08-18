# Sentry 설정 및 사용 가이드

## 개요

이 프로젝트는 Sentry를 사용하여 에러 모니터링, 성능 추적, 사용자 피드백을 수집합니다.

## 설정 파일

### 1. next.config.js

```javascript
const { withSentryConfig } = require("@sentry/nextjs");

module.exports = withSentryConfig(nextConfig, {
  org: "your-org-name",
  project: "your-project-name",
  silent: !process.env.CI,
  disableLogger: true,
});
```

### 2. 환경 변수 설정

`.env.local` 파일에 다음을 추가하세요:

```env
# Sentry Configuration
SENTRY_DSN=your-sentry-dsn-here
NEXT_PUBLIC_SENTRY_DSN=your-sentry-dsn-here
```

### 3. 설정 파일들

- `sentry.client.config.ts` - 클라이언트 사이드 설정
- `sentry.server.config.ts` - 서버 사이드 설정
- `sentry.edge.config.ts` - Edge 런타임 설정

## 사용 방법

### 1. 기본 에러 캡처

```typescript
import { captureError } from "@/common/libs/sentry";

try {
  // 에러가 발생할 수 있는 코드
} catch (error) {
  captureError(error as Error, {
    component: "ComponentName",
    action: "action_name",
  });
}
```

### 2. 메시지 캡처

```typescript
import { captureMessage } from "@/common/libs/sentry";

captureMessage("사용자가 로그인했습니다", "info");
```

### 3. 사용자 정보 설정

```typescript
import { setUser } from "@/common/libs/sentry";

setUser({
  id: "user123",
  email: "user@example.com",
  username: "username",
});
```

### 4. 태그 및 컨텍스트 설정

```typescript
import { setTag, setContext } from "@/common/libs/sentry";

setTag("feature", "payment");
setContext("user_preferences", {
  theme: "dark",
  language: "ko",
});
```

### 5. 성능 모니터링

```typescript
import { startTransaction } from "@/common/libs/sentry";

const transaction = startTransaction("API Call", "http.request");
// API 호출 또는 작업 수행
transaction.finish();
```

### 6. API 에러 핸들링

```typescript
import { handleApiError } from "@/common/libs/sentry";

try {
  const response = await fetch("/api/data");
  if (!response.ok) {
    throw new Error("API request failed");
  }
} catch (error) {
  handleApiError(error, "/api/data");
}
```

### 7. React Error Boundary 사용

```typescript
import SentryErrorBoundary from '@/common/components/elements/SentryErrorBoundary';

<SentryErrorBoundary>
  <YourComponent />
</SentryErrorBoundary>
```

## 테스트

`SentryExample` 컴포넌트를 사용하여 Sentry 기능을 테스트할 수 있습니다:

```typescript
import SentryExample from '@/common/components/elements/SentryExample';

// 페이지나 컴포넌트에서 사용
<SentryExample />
```

## 주요 기능

1. **자동 에러 캡처**: JavaScript 에러, React 에러, API 에러 자동 수집
2. **성능 모니터링**: 페이지 로드 시간, API 응답 시간 추적
3. **사용자 피드백**: 에러 발생 시 사용자 피드백 수집
4. **세션 리플레이**: 사용자 행동 재현
5. **릴리즈 추적**: 배포된 버전별 에러 추적

## Sentry 대시보드

1. [Sentry.io](https://sentry.io)에 로그인
2. 프로젝트 선택
3. Issues 탭에서 에러 확인
4. Performance 탭에서 성능 지표 확인
5. Releases 탭에서 배포 추적

## 환경별 설정

### 개발 환경

- `debug: true`로 설정하여 디버그 로그 활성화
- `tracesSampleRate: 1.0`으로 모든 트랜잭션 추적

### 프로덕션 환경

- `debug: false`로 설정
- `tracesSampleRate: 0.1`로 샘플링 비율 조정
- Source map 업로드 활성화

## 문제 해결

### 1. DSN이 설정되지 않은 경우

환경 변수 `SENTRY_DSN`과 `NEXT_PUBLIC_SENTRY_DSN`이 올바르게 설정되었는지 확인하세요.

### 2. 에러가 Sentry에 전송되지 않는 경우

- 네트워크 연결 확인
- DSN 유효성 확인
- 브라우저 콘솔에서 Sentry 관련 에러 확인

### 3. Source map이 올바르게 업로드되지 않는 경우

- `next.config.js`에서 `org`와 `project` 설정 확인
- Sentry CLI 인증 확인
- 빌드 프로세스에서 source map 생성 확인
