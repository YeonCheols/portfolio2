# Google Cloud Billing Account 설정 가이드

## 1. GOOGLE_CLOUD_BILLING_ACCOUNT 가져오기

### 방법 1: Google Cloud Console에서 확인

1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. 좌측 메뉴 → **"결제"** 클릭
3. **"결제 계정 관리"** 클릭
4. 결제 계정 목록에서 **"결제 계정 ID"** 확인
   - 형식: `XXXXXX-XXXXXX-XXXXXX`

### 방법 2: gcloud CLI 사용

```bash
# 설치된 gcloud CLI로 확인
gcloud billing accounts list

# 출력 예시:
# ACCOUNT_ID            NAME                OPEN  MASTER_ACCOUNT_ID
# XXXXXX-XXXXXX-XXXXXX  My Billing Account  True
```

### 방법 3: API로 확인

```bash
# Google Cloud API 사용
curl -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  https://cloudbilling.googleapis.com/v1/billingAccounts
```

## 2. GOOGLE_APPLICATION_CREDENTIALS 설정

### 방법 1: 서비스 계정 키 생성 (권장)

1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. 좌측 메뉴 → **"IAM 및 관리"** → **"서비스 계정"** 클릭
3. **"서비스 계정 만들기"** 클릭
4. 서비스 계정 정보 입력:
   - 이름: `billing-api-service`
   - 설명: `Billing API access`
5. **"만들고 계속하기"** 클릭
6. **"역할 선택"** → 다음 역할 추가:
   - `결제 계정 사용자` (Billing Account User)
   - `결제 계정 뷰어` (Billing Account Viewer)
   - `프로젝트 뷰어` (Project Viewer)
7. **"완료"** 클릭
8. 생성된 서비스 계정 클릭 → **"키"** 탭 → **"키 추가"** → **"새 키 만들기"**
9. **"JSON"** 선택 → **"만들기"**
10. 다운로드된 JSON 파일 내용을 환경 변수로 설정

### 방법 2: 환경 변수 설정

```bash
# .env.local 파일에 추가
GOOGLE_APPLICATION_CREDENTIALS={"type":"service_account","project_id":"your-project-id","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"billing-api-service@your-project-id.iam.gserviceaccount.com","client_id":"...","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"https://www.googleapis.com/robot/v1/metadata/x509/billing-api-service%40your-project-id.iam.gserviceaccount.com"}
```

### 방법 3: Vercel 환경 변수 설정

1. [Vercel Dashboard](https://vercel.com/dashboard) 접속
2. 프로젝트 선택 → **"Settings"** → **"Environment Variables"**
3. 다음 변수들 추가:
   - `GOOGLE_CLOUD_BILLING_ACCOUNT`: `XXXXXX-XXXXXX-XXXXXX`
   - `GOOGLE_APPLICATION_CREDENTIALS`: JSON 문자열 전체

## 3. 필요한 API 활성화

### Google Cloud Console에서 다음 API 활성화:

1. **Cloud Billing API**
2. **Cloud Billing Budget API**
3. **Cloud Cost Management API**

### 활성화 방법:

1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. 좌측 메뉴 → **"API 및 서비스"** → **"라이브러리"**
3. 각 API 검색 후 **"사용"** 클릭

## 4. 테스트

### 로컬 테스트:

```bash
# 환경 변수 설정 후
pnpm dev

# API 엔드포인트 테스트
curl http://localhost:3000/api/gemini-billing
curl http://localhost:3000/api/gemini-usage
```

### 배포 후 테스트:

```bash
# Vercel 배포 후
curl https://your-domain.vercel.app/api/gemini-billing
curl https://your-domain.vercel.app/api/gemini-usage
```

## 5. 문제 해결

### 일반적인 오류:

- **"Billing Account를 찾을 수 없습니다"**: 결제 계정 ID 확인
- **"서비스 계정 키 파싱에 실패했습니다"**: JSON 형식 확인
- **"권한이 없습니다"**: 서비스 계정에 적절한 역할 부여
- **"API가 활성화되지 않았습니다"**: 필요한 API 활성화

### 디버깅:

```bash
# 로그 확인
pnpm dev

# 환경 변수 확인
echo $GOOGLE_CLOUD_BILLING_ACCOUNT
echo $GOOGLE_APPLICATION_CREDENTIALS
```
