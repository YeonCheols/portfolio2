# Google Cloud Billing API & Monitoring API 연동 가이드

## 📋 개요

이 가이드는 Google Cloud Billing API와 Monitoring API를 실제로 연동하여 Generative Language API의 실제 사용량, 비용, 성능 지표를 가져오는 방법을 설명합니다.

## 🔧 현재 구현 상태

### ✅ 완료된 기능

- Google Cloud Billing API 클라이언트 구현
- Google Cloud Monitoring API 클라이언트 구현
- 실제 토큰 사용량 추출
- 실제 성능 지표 수집
- 실제 비용 데이터 수집
- 에러 처리 및 폴백 로직

### 🚧 필요한 설정

- Google Cloud Project 설정
- 서비스 계정 키 생성
- API 활성화
- 환경 변수 설정

## 🛠️ 설정 단계

### 1. Google Cloud Project 설정

1. [Google Cloud Console](https://console.cloud.google.com/)에 접속
2. 프로젝트 선택 또는 새 프로젝트 생성
3. Project ID 확인 (예: `gen-lang-client-0662926091`)

### 2. API 활성화

다음 API들을 활성화해야 합니다:

```bash
# Cloud Billing API 활성화
gcloud services enable cloudbilling.googleapis.com

# Cloud Monitoring API 활성화
gcloud services enable monitoring.googleapis.com

# Generative Language API 활성화
gcloud services enable generativelanguage.googleapis.com
```

### 3. 서비스 계정 생성

1. Google Cloud Console → IAM & Admin → Service Accounts
2. "Create Service Account" 클릭
3. 서비스 계정 이름 입력 (예: `gemini-billing-monitor`)
4. 설명 입력: "Gemini API 사용량 및 비용 모니터링"

### 4. 권한 부여

서비스 계정에 다음 권한을 부여합니다:

- **Billing Account User** (`roles/billing.user`)
- **Monitoring Viewer** (`roles/monitoring.viewer`)
- **Project Viewer** (`roles/viewer`)

### 5. 서비스 계정 키 생성

1. 서비스 계정 목록에서 생성한 계정 클릭
2. "Keys" 탭 → "Add Key" → "Create new key"
3. JSON 형식 선택
4. 키 파일 다운로드

### 6. 환경 변수 설정

`.env.local` 파일에 다음 변수들을 설정합니다:

```env
# Gemini API
GEMINI_API_KEY=your_gemini_api_key_here

# Google Cloud 설정
GOOGLE_CLOUD_PROJECT_ID=your_project_id_here
GOOGLE_CLOUD_BILLING_ACCOUNT=your_billing_account_id_here

# 서비스 계정 키 (JSON 문자열)
GOOGLE_APPLICATION_CREDENTIALS={"type":"service_account","project_id":"your-project-id",...}
```

**중요**: `GOOGLE_APPLICATION_CREDENTIALS`는 JSON 파일의 전체 내용을 문자열로 설정해야 합니다.

## 📊 API 엔드포인트

### 1. 사용량 및 성능 지표

```
GET /api/gemini-usage
```

**응답 예시:**

```json
{
  "success": true,
  "message": "Generative Language API 실제 데이터를 성공적으로 가져왔습니다.",
  "usage": {
    "model": "gemini-1.5-flash",
    "promptTokens": 5,
    "candidatesTokenCount": 10,
    "totalTokenCount": 15
  },
  "performanceMetrics": {
    "totalRequests": 40,
    "errorRate": 12,
    "medianLatency": 416,
    "latency95th": 11184,
    "source": "Google Cloud Monitoring API (실제 데이터)"
  },
  "billingData": {
    "currentMonthCost": 0.00009375,
    "source": "Google Cloud Billing API (실제 데이터)"
  },
  "dataSources": {
    "tokenUsage": "실제 Gemini API",
    "performanceMetrics": "실제 Google Cloud Monitoring",
    "billingData": "실제 Google Cloud Billing"
  }
}
```

### 2. 비용 정보

```
GET /api/gemini-billing
```

## 🔍 데이터 소스별 정보

### 1. 토큰 사용량

- **소스**: Gemini API 직접 호출
- **데이터**: 실시간 토큰 사용량
- **정확도**: 100% 정확

### 2. 성능 지표

- **소스**: Google Cloud Monitoring API
- **데이터**: 24시간 누적 성능 지표
- **정확도**: 실제 모니터링 데이터

### 3. 비용 정보

- **소스**: Google Cloud Billing API
- **데이터**: 현재 월 누적 비용
- **정확도**: 실제 청구 데이터

## 🚨 문제 해결

### 일반적인 오류

1. **"GOOGLE_APPLICATION_CREDENTIALS 환경 변수가 설정되지 않았습니다"**

   - 서비스 계정 키가 올바르게 설정되었는지 확인
   - JSON 문자열 형식이 올바른지 확인

2. **"Billing Account를 찾을 수 없습니다"**

   - Billing Account ID가 올바른지 확인
   - 서비스 계정에 Billing 권한이 있는지 확인

3. **"API가 활성화되지 않았습니다"**
   - Cloud Billing API 활성화
   - Cloud Monitoring API 활성화

### 권한 문제

```bash
# 서비스 계정 권한 확인
gcloud projects get-iam-policy YOUR_PROJECT_ID \
  --flatten="bindings[].members" \
  --format='table(bindings.role)' \
  --filter="bindings.members:YOUR_SERVICE_ACCOUNT_EMAIL"
```

### API 할당량 확인

```bash
# API 할당량 확인
gcloud compute regions describe us-central1
```

## 📈 모니터링 및 알림

### 1. 비용 알림 설정

1. Google Cloud Console → Billing → Budgets & alerts
2. 새 예산 생성
3. 알림 임계값 설정 (예: 80%, 100%)

### 2. 성능 모니터링

1. Google Cloud Console → Monitoring → Dashboards
2. 커스텀 대시보드 생성
3. API 지연시간, 오류율 등 지표 추가

## 🔒 보안 고려사항

1. **서비스 계정 키 보안**

   - 키 파일을 버전 관리에 포함하지 않음
   - 정기적으로 키 로테이션
   - 최소 권한 원칙 적용

2. **환경 변수 보안**

   - 프로덕션 환경에서는 안전한 시크릿 관리 사용
   - 로컬 개발 환경에서만 `.env.local` 사용

3. **API 접근 제한**
   - IP 화이트리스트 설정
   - API 키 사용량 제한 설정

## 🚀 향후 개선 사항

1. **실시간 알림**

   - Slack/Email 알림 연동
   - 비용 임계값 초과 시 자동 알림

2. **고급 분석**

   - 사용량 트렌드 분석
   - 비용 최적화 권장사항

3. **대시보드 개선**
   - 실시간 차트 업데이트
   - 커스텀 필터링 기능

## 📞 지원

문제가 발생하면 다음을 확인하세요:

1. Google Cloud Console 로그
2. 애플리케이션 로그
3. API 할당량 상태
4. 서비스 계정 권한

---

**참고**: 이 가이드는 Google Cloud API의 최신 버전을 기준으로 작성되었습니다. API 변경사항이 있을 수 있으니 [공식 문서](https://cloud.google.com/docs)를 참조하세요.
