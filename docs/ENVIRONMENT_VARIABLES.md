# 환경변수 설정 가이드

## Gemini Usage Page 접근 제어

### 개발 환경 (.env.local)

```bash
# Gemini Usage Page 활성화 (개발 환경에서만)
ENABLE_GEMINI_USAGE_PAGE=true
```

### 프로덕션 환경

```bash
# Gemini Usage Page 비활성화 (기본값)
ENABLE_GEMINI_USAGE_PAGE=false
# 또는 환경변수를 설정하지 않음
```

## 보안 고려사항

1. **서버 사이드에서만 접근 제어**: `getServerSideProps`를 사용하여 서버에서 접근을 차단
2. **API 라우트 보호**: API 엔드포인트에서도 동일한 접근 제어 적용
3. **환경변수 기반**: `NODE_ENV` 대신 전용 환경변수 사용으로 보안 강화

## 사용 방법

1. 개발 환경에서 `.env.local` 파일에 `ENABLE_GEMINI_USAGE_PAGE=true` 추가
2. 프로덕션 배포 시에는 해당 환경변수를 설정하지 않거나 `false`로 설정
3. 페이지 접근 시 404 에러가 발생하여 접근이 차단됨
