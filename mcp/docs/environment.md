# MCP 환경파일 가져오기

정적 환경변수는 비공개 `YeonCheols/portfolio-config` 저장소의 `environments/backend/portfolio-mcp/{development,production}.env`에서 관리합니다.
MCP 프로젝트에는 원본 값을 복제해 커밋하지 않고 CLI로 필요한 환경파일을 가져옵니다.

## 준비

- `portfolio-config` 0.2.1 이상과 GitHub CLI(`gh`)가 설치되어 있어야 합니다.
- 실행 폴더에서 `portfolio-config --version`으로 PATH 등록을 확인합니다.
- 이 저장소의 `git gh` 인증에 portfolio-config 저장소 읽기 권한이 필요합니다. 별칭이 없는 독립 프로젝트는 일반 `gh` 인증을 사용합니다.
- 중앙 파일의 `__REQUIRED_*__` 항목은 실제 값으로 채워야 합니다. 미입력 상태에서는 파일 저장을 거부합니다.

## 사용

`mcp/` 폴더에서 개발 또는 운영 환경을 선택합니다.

```sh
pnpm env:pull --env development --output .env.local
pnpm env:pull --env production --output .env.production.local
```

저장소 루트에서는 다음과 같이 실행합니다.

```sh
pnpm --dir mcp env:pull --env development --output .env.local
```

출력 경로는 MCP 폴더 기준입니다. 기존 파일은 덮어쓰지 않으며 교체가 필요할 때 `--force`를 붙입니다.
저장할 디렉터리는 미리 존재해야 합니다. 예시의 `.env.local`과 `.env.production.local`은 Git 추적에서 제외됩니다.

```sh
pnpm env:pull --env development --output .env.local --force
pnpm env:pull --env development --output .env.local --ref COMMIT_SHA
```

기본 조회 브랜치는 `master`입니다. `--ref`로 다른 브랜치나 고정 커밋을 선택할 수 있습니다.
조회·인증·검증 실패는 명령 실패로 반환하며 기존 파일을 대체하지 않습니다.
CLI는 실제 값을 터미널에 출력하지 않습니다.

## 로컬 실행과 정적 주입

파일을 가져오는 명령은 서버를 실행하거나 현재 터미널의 환경변수를 변경하지 않습니다.
`pnpm start`는 `.env` 파일을 명시적으로 읽어 서버를 시작합니다. Node 20.12 이상이 필요합니다.

```sh
pnpm env:pull --env development --output .env
pnpm build
pnpm start
```

파일 저장 없이 시작할 때 원격 설정을 직접 전달할 수도 있습니다.

```sh
pnpm start:dev
pnpm start:prod
```

두 명령은 `portfolio-config run`을 사용합니다. 고정 커밋을 선택하려면 CLI를 직접 실행합니다.

```sh
portfolio-config run --app portfolio-mcp --env production --ref COMMIT_SHA -- node apps/backend/dist/bootstrap/server.js
```

`runtime-config.ts`가 서버·인증 API·이력서 API와 모델 설정 조회 연결을 시작 시 검증합니다.
모델명·공급자·모델 키를 정적 프로세스 설정에서 읽는 이전 경로는 제거했습니다.

## 동적 AI 모델 주입

정적 파일은 `RESUME_MODEL_SETTING_URL`, `RESUME_MODEL_SETTING_TOKEN`, `RESUME_MODEL_ENVIRONMENT`를 제공합니다.
이는 모델 자체가 아니라 활성 모델을 조회하기 위한 연결 정보입니다.

1. 새 이력서 생성 요청만 모델 클라이언트를 만듭니다.
2. 첫 모델 호출에서 portfolio-api의 해당 환경 활성 모델을 조회합니다.
3. `provider`, `modelName`, `url`, `apiKey`를 읽어 모델 클라이언트에 전달합니다.
4. 전체 선택 섹션의 이력서 작성에 모델을 한 번 호출하며, 근거 검증과 PDF는 내부 코드로 처리합니다.
5. 다음 새 생성 요청은 활성 설정을 다시 조회하므로 모델 변경마다 서버를 재시작하지 않습니다. 기존 생성의 재검증·PDF에는 보관된 원본 소스 스냅샷을 사용합니다.

모델 설정·활성 상태·실제 API 키는 portfolio-api가 소유합니다. MCP 설정 화면은 실제 API 키를 입력받아 API에 저장 요청만 전달하며 로컬 파일·프로세스 전역 환경에 저장하지 않습니다.
저장·수정·활성화·삭제 응답에는 `apiKey` 대신 `hasApiKey`만 반환합니다. 실제 키는 `RESUME_MODEL_SETTING_TOKEN`으로 보호된 활성 설정 조회와, 인증된 관리 목록(`GET /service/resume-model-setting`, portfolio-api #108)에서만 반환합니다. 관리 목록의 키는 설정별 연결 테스트가 비활성 설정도 호출하기 위한 것이며, MCP 관리 서버가 이 목록을 관리 화면 API로 그대로 전달하므로 관리 세션이 있는 사용자의 브라우저 응답에도 포함됩니다. 화면은 이 값을 사용하거나 표시하지 않습니다.
MCP는 모델 키를 Secret Manager에서 읽지 않으며 모델 호출에 GCP ADC 인증도 필요하지 않습니다.
GitHub 저장소 읽기에 사용하는 Cloud Run bootstrap 인증은 아래처럼 별도로 유지합니다.
정적 파일에는 `RESUME_MODEL_URL`, `RESUME_MODEL_PROVIDER`, `RESUME_MODEL_NAME`, `RESUME_MODEL_TOKEN`을 넣지 않습니다.
API 조회 실패·키 누락이면 모델을 호출하지 않으며 이전 정적 값이나 시크릿 참조로 대체하지 않습니다.
기존 참조명만 저장된 모델은 실제 키가 들어간 새 설정을 등록하고 활성화해야 합니다.
portfolio-api의 migration과 새 API 배포를 먼저 준비한 뒤 MCP를 배포합니다. 실제 키를 응답하는 조회는 캐시하지 않습니다.

## 이력서 원본 보관과 재실행

`generate_resume`에 기존 source·선택 항목·양식을 전달하면 새 생성입니다. 정상적인 내용 생성부터 PDF 완료까지 외부 모델 호출은 한 번입니다. 원문 인용 근거를 포함한 JSON 응답을 받은 뒤 출처·인용 구절·충돌·양식은 내부에서 검사합니다. 문장 전체의 의미를 모델로 다시 검증하지 않으며 결과의 `validationMode`는 `source_evidence`입니다. 관리 화면 연결 테스트는 별개로 일반·구조화 응답을 최대 두 번 호출하는 기존 방식을 유지합니다.

새 생성 요청은 같은 인증자 `sub`와 서버 환경의 이전 보관 데이터를 접수 즉시 초기화합니다. 응답 수신까지 초기화를 미루거나, 새 생성 실패 후 이전 원문을 복원하지 않습니다. 모델 JSON 원문은 파싱 전에 저장하며 모델 요청과 생성 당시 소스·양식 스냅샷을 함께 보관합니다. PDF·검증 실패는 현재 원문을 삭제하지 않고, 새 생성 없이 재실행할 때는 원문을 그대로 사용합니다. 개인 키·서비스 토큰·OAuth 토큰은 저장하지 않습니다.

생성 성공 JSON과 생성 중 오류 JSON에서 `generationId`를 받습니다. 다음 두 입력은 원본 조회 API와 모델을 호출하지 않습니다.

```json
{
  "name": "generate_resume",
  "arguments": { "generationId": "<생성 응답의 ID>" }
}
```

```json
{
  "name": "convert_resume_to_pdf",
  "arguments": { "generationId": "<생성 응답의 ID>" }
}
```

`generate_resume`의 새 생성 입력과 `generationId` 재실행 입력은 함께 보내지 않습니다. 이전 `generatedResume` 문자열을 PDF에 전달하던 입력 계약은 지원하지 않으며, 서버 보관본의 ID만 사용합니다. 직접 `claims`를 제출하면 evidence의 sourceId·quote를 함께 제공해야 하며 내부 검증만 수행합니다. `interpretation` 재작성 안내 입력은 지원하지 않습니다. PDF는 보관 원문을 다시 파싱·검증해 본문을 조립하며 클라이언트가 바꾼 본문·소스·검증 상태를 신뢰하지 않습니다.

원문 수신 전 재실행은 `GENERATION_NOT_READY`, 알 수 없거나 이전·다른 소유자·다른 환경의 ID는 `GENERATION_NOT_FOUND`입니다. 새 생성 이후 이전 작업이 늦게 끝나도 결과를 다시 저장하거나 PDF를 반환하지 않습니다. 파싱 실패 원문도 그대로 남으므로 잘못된 JSON은 같은 ID로 재실행해도 동일하게 실패하며, 재작성하려면 명시적인 새 생성을 요청해야 합니다.

도구의 `generationId` 재실행 저장소는 Cloud Run의 Node 프로세스 메모리이며 같은 서버 인스턴스에서만 재실행할 수 있습니다. 프로세스 재시작·리비전 교체·인스턴스 종료 시 소실되고 다른 인스턴스와 공유되지 않습니다. 다중 인스턴스 라우팅으로 결과가 없어도 자동 유료 호출은 하지 않습니다. 아래 Storage 디버깅 기록은 이 실행 메모리를 복구하거나 대체하지 않습니다.

## MCP 공통 Storage와 이력서 디버깅 기록

중앙 MCP 설정의 `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `MCP_STORAGE_BUCKET`을 시작 시 읽습니다. 세 값이 모두 없으면 기존 메모리 실행을 유지하고, 일부만 있으면 시작을 거부합니다. 연결은 HTTPS 프로젝트 origin과 비공개 버킷을 사용하며 서버용 키는 브라우저에 전달하거나 로그에 출력하지 않습니다. `mcp` 버킷은 미리 생성해야 하며 런타임이 버킷을 자동 생성하거나 공개로 변경하지 않습니다.

`apps/backend/src/infrastructure/storage/supabase-storage.ts`는 MCP 공통 JSON 업로드·재조회·5분 만료 서명 URL 발급을 소유합니다. 환경 변수에는 버킷 이름만 두고 이력서의 하위 경로는 `apps/backend/src/modules/resume/archive/resume-debug-archive.ts`가 지정합니다.

```text
mcp/
  debug/resume/{environment}/{subjectHash}/{generationId}/{attemptId}/
    001-started.json
    002-source.json
    ...
```

`mcp`는 버킷 이름이며 실제 객체 키는 `debug/resume/`에서 시작합니다. 인증 서버의 `sub`는 SHA-256 해시로 경로를 나누고, 새 생성·재검증·PDF 변환마다 독립된 attempt ID를 사용합니다. 각 단계는 새 객체로 저장하며 기존 기록을 덮어쓰지 않습니다.

기록은 버전·시각·동작·단계와 그때까지 확보한 소스/양식 스냅샷, 모델 요청, 파싱 전 응답 문자열, 검증 결과를 포함합니다. 실패 기록에는 오류 코드와 마지막으로 보관한 단계(`failedAfter`)를 담고 공급자 예외 메시지·HTTP 헤더·서버 키·OAuth 토큰은 담지 않습니다. 선택 원문 자체는 개인정보를 포함할 수 있으므로 공개 버킷이나 공개 URL로 제공하지 않습니다.

활성 설정을 해석한 뒤 모델 호출 전에 `model.provider`와 `model.modelName`만 기록합니다. API 키와 연결 주소는 모델 정보에 담지 않습니다. 이 정보는 생성 메모리에도 보관하여 같은 `generationId`의 재검증·PDF 실행 기록으로 전달하며 설정을 다시 조회하지 않습니다. 모델 호출 전에 실패하면 정보가 없을 수 있고, 직접 claims를 제출하거나 이전에 생성한 기록에도 정보가 없습니다. 관리자 상세 화면의 상단 실행 요약에 `AI 사용 모델`로 표시하며 미기록 값은 `기록 없음`으로 표시합니다.

검증 기록의 `status`는 `passed` 또는 `blocked`이며 작업 단계의 `completed`와 구분합니다. 생성 작업은 검증 오류가 있어도 원문과 결과를 반환하는 기존 계약을 유지하고, 미해결 누락·충돌은 PDF 단계에서 차단합니다. `diagnostics`에는 근거 검사에서 거절된 문장의 원래 배열 위치(`claimIndex`, 0부터 시작), 문장, 양식 항목, 출처 ID와 인용을 담습니다. 숫자 오류에는 정규화한 근거 값(`numeric.expected`), 문장 값(`actual`), 일치하지 않은 값(`unsupported`)을 함께 담습니다. 구조 검사 오류의 기존 `validationIssues`·`gaps`·`conflicts`도 그대로 보관합니다. 인용과 숫자의 일치만으로 문장 전체 의미가 검증됐다고 간주하지 않습니다.

모델 응답은 메모리에 먼저 보존하고 Storage 저장 완료를 기다린 뒤 파싱합니다. 새 생성으로 메모리의 이전 결과가 교체되더라도 늦게 도착한 응답은 이전 실행의 디버깅 경로에 남기며, 현재 생성 메모리를 되살리지 않습니다. 파싱·출처 검증·PDF 실패도 확보한 원문과 함께 기록합니다.

Storage가 설정된 상태에서 저장이 실패하면 `DEBUG_STORAGE_FAILED`로 표시하고 저장 성공으로 간주하거나 모델을 자동 재호출하지 않습니다. 응답을 받은 뒤 저장에 실패한 경우 메모리의 원문은 유지합니다. 보관용 HTTP 요청은 10초 제한이며 임의 재시도나 다른 저장소로의 fallback은 없습니다.

DB 실행 목록·관리 화면 연결·Storage 기록으로부터의 재실행 UI는 이 파이프라인과 별도 후속 작업입니다. 관리자 화면에서 원문을 조회할 때에는 인증을 확인한 뒤 서명 URL을 발급해야 하며 서버용 키를 직접 전달하지 않습니다. 기록 정리·자동 삭제·보관 기간 작업은 이번 범위에 포함하지 않습니다.

## AI 공급자 연결

관리 화면에서 공급자를 고르면 다음 기본 주소를 입력합니다. 모델 이름과 키는 portfolio-api 설정으로 관리하며, 공급자 추가만으로 실제 모델 설정을 등록하거나 활성화하지 않습니다.

- `openrouter`: `https://openrouter.ai/api/v1/chat/completions`
- `openai`: `https://api.openai.com/v1/chat/completions`
- `gemini`: `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions`

모델 이름은 직접 입력합니다. 공급자별 옵션·기본 주소·모델 ID 예시·공식 모델 목록 링크는 관리 화면의 `apps/console/src/settings/providers/model-providers.ts`에 있는 `MODEL_PROVIDERS` 상수가 소유합니다. 공급자를 바꾸면 예시와 링크만 바뀌며 직접 입력한 모델 이름은 유지합니다. 예시는 기본 모델 설정이 아니며 저장할 값으로 자동 입력하지 않습니다.

OpenAI는 [Chat Completions](https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create)를 사용하고, Gemini는 [Google의 OpenAI 호환 API](https://ai.google.dev/gemini-api/docs/openai)에 직접 연결합니다. 세 공급자 모두 Bearer 인증과 `model`, `messages`를 사용합니다. 구조화 호출은 `response_format`의 `json_schema`를 전달하며 OpenRouter만 `provider.require_parameters`를 추가합니다. `temperature`, 토큰 수, 추론 강도 등 모델별 제약이 있는 선택 파라미터는 보내지 않습니다. 선택한 모델이 Chat Completions와 구조화 출력을 지원하는지는 설정별 연결 테스트로 확인합니다. Responses 전용 모델은 이 연결의 대상이 아닙니다.

공통 전송·응답 검증·상태 코드 변환은 `apps/backend/src/infrastructure/ai/chat-completion-model-connection.ts`가 소유하며 공급자별 진입점은 각 어댑터가 소유합니다. 두 서버 연결 맵에 모두 등록하여 연결 테스트와 이력서 생성이 같은 어댑터를 사용합니다. 기존 연결 테스트의 시간 제한, 키 가림, 응답 길이 제한과 오류 본문 비공개 계약은 유지합니다.

#180의 portfolio-api 공급자 타입 추가·배포는 사용자 확인 기준 완료된 선행 작업입니다. MCP 배포 전 공급자별 호스트 정책과 저장·활성화 계약을 확인합니다. 실제 모델 설정 등록·활성화·실호출 확인은 OpenAI만 수행하며 Gemini는 가짜 네트워크 테스트로 구조를 검증합니다. API 키는 관리 화면에서 입력하고 이슈나 로그에 남기지 않습니다.

## 컨테이너 시작과 운영 배포

이미지에는 체크섬을 확인한 Linux musl CLI 0.2.1과 gh만 포함합니다. 앱 설정 파일과 GitHub 인증은 이미지에 넣지 않습니다.
`start-with-config.sh`가 컨테이너 시작 시 `portfolio-config run`으로 정적 환경을 가져온 뒤 기본 CMD의 Node 서버를 실행합니다.

- `PORTFOLIO_CONFIG_ENVIRONMENT`: 기본값은 production이며 development도 선택할 수 있습니다.
- `PORTFOLIO_CONFIG_REF`: 기본값은 master이며 브랜치나 고정 커밋 SHA를 선택할 수 있습니다.
- `GH_TOKEN`: 비공개 portfolio-config를 읽는 GitHub 인증을 실행 시 전달합니다. CLI 조회 후 Node 프로세스에는 상속하지 않습니다.
- Cloud Run의 PORT와 플랫폼 PORT는 별도로 보존합니다. 정적 설정 조회에 실패하면 서버를 시작하지 않습니다.

Actions는 GCP WIF 인증 후 Secret Manager의 `PORTFOLIO_CONFIG_READ_TOKEN`을 임시 파일로 읽습니다.
이 인증으로 고정 CLI 릴리스만 준비하고, 바이너리 디렉터리를 `configcli` named build context로 이미지에 복사합니다.
앱 환경변수는 Actions에서 조회하거나 나열하지 않습니다. GitHub 인증 파일은 컨텍스트에 포함하지 않고 성공·실패와 관계없이 마지막 단계에서 삭제합니다.
Docker 컨텍스트에서도 `.env*`를 제외합니다.

Cloud Run에는 같은 Secret Manager 항목을 `GH_TOKEN`으로 연결하고 환경·ref만 부트스트랩으로 지정합니다.
GitHub Actions에 별도 `PORTFOLIO_CONFIG_READ_TOKEN` secret을 중복 등록하지 않습니다.
최초에는 기존 GitHub 인증 중 portfolio-config의 Contents 읽기 권한이 있는 것을 이 GCP 항목에 한 번 등록하고 배포 계정과 런타임 계정에 접근 권한을 준비해야 합니다.
토큰을 새로 발급해야 한다는 뜻은 아니며, 로컬 git gh 인증이 Cloud Run으로 자동 공유되지는 않습니다.
운영 부트스트랩 토큰 등록과 해당 시크릿의 계정 접근 권한은 준비했습니다. 새 MCP 이미지의 운영 배포는 master 병합 후 진행됩니다.

로컬 Docker 빌드에는 실행 플랫폼과 맞는 Linux CLI 바이너리를 준비합니다. 디렉터리 안에는 실행 가능한 `portfolio-config` 파일이 있어야 합니다.

```sh
docker build --build-context configcli=/path/to/linux-cli-directory -f mcp/Dockerfile -t portfolio-mcp mcp
docker run --rm --env GH_TOKEN --env PORTFOLIO_CONFIG_ENVIRONMENT=development -p 8080:8080 portfolio-mcp
```

컨테이너의 기본 CMD는 MCP 서버이며 `docker run`에 다른 명령을 지정해도 먼저 정적 설정을 준비합니다.

정적 파일 변경은 새 컨테이너가 시작할 때 적용되며 기존 프로세스에는 자동 반영되지 않습니다.
master를 사용하면 변경 이후 시작한 인스턴스부터 새 설정을 읽습니다.
같은 Cloud Run 리비전의 설정을 동일하게 고정하려면 `PORTFOLIO_CONFIG_REF`에 커밋 SHA를 지정하고 설정 변경 시 새 SHA로 리비전을 갱신합니다. 이때 이미지는 재사용할 수 있습니다.
활성 AI 모델 변경은 기존처럼 다음 도구 요청에서 조회합니다.
