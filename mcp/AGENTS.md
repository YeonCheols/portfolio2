# AGENTS.md

이 파일은 `mcp/`에서 작업하는 AI 에이전트의 지침 원본입니다. MCP를 별도 저장소로 분리할 때 이 파이프라인도 함께 옮깁니다. 진입점 파일에는 내용을 늘리지 않고 이 파일만 수정합니다.

웹 앱 저장소 안에 있을 때의 공통 스킬은 상위 `.agents/skills/<name>/SKILL.md`를 따릅니다. 코드 수정은 `tdd`, 커밋은 `commit`, PR은 `pr`, 검증은 `qa`, 리뷰는 `review`, 이슈는 `issue`입니다.

## 경계

- `mcp/`는 웹 앱 `src/`와 분리된 프로젝트입니다. 이력서 엔티티, `resume.xml`, `parseResumeXml`을 가져오지 않습니다.
- OAuth 인증과 토큰 수명주기는 portfolio-api가 소유합니다. MCP 서버는 요청마다 portfolio-api introspection endpoint를 호출하며 refresh token을 처리하지 않습니다.
- 인증·배포·클라이언트 연결 작업 전 [`docs/oauth-gateway.md`](docs/oauth-gateway.md)를 읽습니다.
- 토큰과 시크릿은 저장소, 클라이언트 설정, 로그에 남기지 않습니다. 연락처 원문은 이슈 본문과 로그에 넣지 않습니다.
- 사용자에게는 한국어로 답합니다. 근거를 남기는 문장은 `~습니다` 또는 `~ㅂ니다`로 끝냅니다.

## 프로세스

MCP 서버만 배포하며 OAuth 처리는 portfolio-api에 위임합니다.

| 프로세스   | 소스                                   | 실행 파일                               |
| ---------- | -------------------------------------- | --------------------------------------- |
| 이력서 MCP | `apps/backend/src/bootstrap/server.ts` | `apps/backend/dist/bootstrap/server.js` |

이후 포트폴리오 MCP는 `apps/backend/src/modules/portfolio/`에 둡니다. `resume` 내부를 가져오지 않습니다. 디렉터리는 그 작업이 시작될 때 만듭니다.

## 디렉터리

```text
mcp/
├── apps/
│   ├── console/                 관리자 React + Vite 앱
│   └── backend/
│       └── src/
│           ├── interfaces/      소비처: tools, admin
│           ├── modules/         업무: resume, ai-models
│           ├── infrastructure/  AI, portfolio-api, connection, storage
│           └── bootstrap/       실행 설정, HTTP 서버, 의존성 조립
├── packages/admin-contracts/    웹·서버 공용 메뉴와 순수 계약
├── pnpm-workspace.yaml
├── pnpm-lock.yaml
├── package.json
├── scripts/
├── fonts/
└── docs/
```

`mcp/`는 상위 웹 앱과 독립적인 pnpm workspace입니다. `apps/console`과 `apps/backend`는 `workspace:*`로 `@portfolio-mcp/admin-contracts` 공개 진입점만 공유합니다. 다른 패키지 소스를 상대경로로 가져오지 않습니다. 공통 계약은 서버·브라우저 전용 의존성이 없는 순수 데이터와 타입으로 유지합니다.

`interfaces/tools`와 `interfaces/admin`은 요청·응답 경계를 소유하며 서로의 내부 구현을 가져오지 않습니다. 업무 규칙은 `modules/resume`과 `modules/ai-models`가 소유합니다. 업무 모듈은 `interfaces`나 `bootstrap`을 가져오지 않습니다. `bootstrap`이 실제 연결과 라우트를 조립합니다. 이력서 아카이브는 관리자와 도구가 함께 사용하므로 `modules/resume/archive`가 소유합니다. 모델 설정 저장·활성화의 실제 소유자는 portfolio-api이며 `modules/ai-models`는 설정 연결 진단을 담당합니다.

`infrastructure/storage`는 공통 Storage 연결을 소유하고 `debug/resume/` 같은 하위 경로는 이력서 모듈이 소유합니다. `infrastructure/connection`은 공통 오류와 fetch 계약, `infrastructure/ai`는 모델 호출과 공급자 어댑터, `infrastructure/portfolio-api`는 외부 API 연결을 소유합니다. 이번 이동에서 기존 연결 계약과 함수 이름을 유지합니다.

백엔드 내부 import는 `@mcp/...` alias를 사용하고, 패키지 간에는 공개 패키지 이름을 사용합니다. 백엔드 alias는 `apps/backend/tsconfig.json`에 정의하고 빌드 후 상대경로로 변환합니다. 콘솔 내부는 상대경로를 사용합니다. 테스트는 대상 파일 옆에 두며 `directory-boundary.test.ts`와 백엔드 `runtime-boundary.test.ts`가 구조 경계를 검사합니다.

MCP 루트 `pnpm build`는 공통 계약 → 백엔드 → 콘솔 순서로 빌드합니다. `pnpm type-check`는 세 패키지를 검사합니다. `pnpm test`는 자체 Jest 백엔드·공통 계약·구조 테스트와 콘솔 Vitest를 차례로 실행합니다. 개별 실행은 `pnpm test:backend`, `pnpm test:console`, CI 실행은 `pnpm test:ci`를 사용하며 백엔드 커버리지는 MCP 루트 `coverage/`에 기록합니다. Jest·SWC 변환기·테스트 타입은 MCP 루트 devDependencies가 소유하고 `jest.config.cjs`는 Node 환경에서 자체 alias만 정의합니다. 상위 웹 앱의 Jest·setup·node_modules를 사용하지 않습니다. 산출물은 각 패키지 `dist/`에 두며 서버가 `apps/console/dist`를 서빙합니다. PDF 폰트는 MCP 루트 `fonts/`에서 읽습니다.

## 명명 규칙

파일·폴더는 kebab-case, 타입·인터페이스·클래스·컴포넌트는 PascalCase, 일반 함수·변수는 camelCase로 작성합니다. 기존 전역 상수와 외부 계약·도구 지정 파일명은 유지합니다. 테스트는 대상 파일과 같은 이름의 `.test.ts(x)`를 사용합니다. 적용 범위·예외·공식 가이드 근거는 [명명 규칙](docs/naming-conventions.md)을 따릅니다.

## 로컬 Compose

정적 검사는 `pnpm lint`로 MCP의 `.oxlintrc.json`을 명시해 Oxlint를 실행합니다. 백엔드·콘솔·공통 계약의 src를 검사하고 Next.js와 웹 FSD 규칙은 사용하지 않습니다. 콘솔의 React legacy 규칙 2개는 고정한 JS 플러그인으로 보완합니다. 오류는 실패, 경고는 비차단으로 처리합니다. `pnpm lint:verify`는 fixture 12개와 종료 코드 정책을 확인하며 두 명령을 CI·Compose 검증에 포함합니다. 비교 측정은 선택적인 `pnpm lint:evaluate`이며 CI에서 성능 측정을 반복하지 않습니다.

`docker-compose.yml`의 서버는 `portfolio-config development/master`로 고정합니다. 실제 설정값·모델 키를 Compose에 넣지 않습니다. `pnpm local:up`은 서버를 시작하고 `pnpm local:down`은 종료하며 `pnpm verify:container`는 인증 없이 동일 workspace에서 타입·테스트·HTTP·PDF 검증을 실행합니다. 명시적 요청 없이 로컬 서버를 자동 실행하지 않습니다. 상세 절차와 이미지 target은 [Compose 가이드](docs/local-compose.md)를 따릅니다.

## 도구

도구 목록의 소유자는 `apps/backend/src/interfaces/tools/handle-mcp-request.ts`입니다. 동작의 소유자는 `apps/backend/src/interfaces/tools/resume/resume-tools.ts`입니다. 선택 조합은 `composeResume` 결과를 사용합니다.

공통 인자:

- `source`는 `repository`, `embedded`, `file` 중 하나입니다. 그 외는 `INVALID_INPUT`입니다.
- `embedded`와 `file`은 `xml` 문자열이 필요합니다.
- `elementIds`와 `sectionOrder`는 문자열 배열입니다. 선택하지 않은 원소는 출력에서 빠집니다.
- `template`은 `기본형`, `경력 중심형`, `프로젝트 중심형`만입니다. 목록의 소유자는 `apps/backend/src/modules/resume/model/resume-template.ts`입니다. `render_resume_template`, `render_resume_form`, `read_resume_selection`, `check_resume_draft`, `generate_resume`가 이 목록을 함께 씁니다. 다른 이름은 `UNKNOWN_TEMPLATE`만 반환합니다.

| 도구                     | 하는 일                                                                            |
| ------------------------ | ---------------------------------------------------------------------------------- |
| `validate_resume_xml`    | 모델을 읽고 이력서 id를 반환합니다.                                                |
| `list_resume_elements`   | 원소 id, 섹션, 이름, 출처만 JSON으로 반환합니다. 본문은 넣지 않습니다.             |
| `preview_resume`         | 섹션 이름과 원문 줄만 이어 붙입니다. 원소 이름은 붙이지 않습니다.                  |
| `read_resume_selection`  | 선택한 원소의 식별자, 원문, 출처, 공개 여부를 JSON으로 반환합니다.                 |
| `check_resume_draft`     | 초안 문장의 근거를 선택 원소와 맞춰 누락, 충돌, 확인 대상을 반환합니다.            |
| `generate_resume`        | 선택된 양식 섹션을 한 번에 작성 요청하고, 받은 문장을 검사해 최종 본문을 만듭니다. |
| `render_resume_template` | 원소 이름과 원문을 한 줄로 출력합니다.                                             |
| `render_resume_form`     | 한글 항목명과 원문으로 이력서 양식을 출력합니다.                                   |

없는 도구 이름은 `UNKNOWN_TOOL`입니다. 연결이 거부한 입력은 연결 오류 코드만 반환합니다. OpenRouter·OpenAI·Gemini 공급자가 비정상 상태로 응답하면 `chat-completion-model-connection.ts`가 상태 코드로 오류 코드를 나눕니다. 401·403은 `MODEL_AUTH_FAILED`, 429와 5xx는 `MODEL_PROVIDER_ERROR`, 그 밖의 거부는 `MODEL_REJECTED`입니다. `generate_resume`도 같은 어댑터를 쓰므로 이 코드가 도구 응답의 연결 오류 코드로 그대로 전달됩니다. 공급자의 오류 본문은 읽지도 전달하지도 않습니다.

`render_resume_template`, `render_resume_form`, `read_resume_selection`, `check_resume_draft`, `generate_resume`는 `apps/backend/src/modules/resume/compose/select-template-sections.ts`의 같은 섹션 선택을 사용합니다.

- `기본형`은 프로필, 학력, 경력, 프로젝트 순서입니다.
- `경력 중심형`은 선택한 경력과, 그 경력에 `employmentRef`로 연결된 프로젝트만 보여 줍니다.
- `프로젝트 중심형`은 선택한 프로젝트와, 그 프로젝트가 가리키는 경력만 보여 줍니다.
- 이 네 섹션 밖은 이 출력들에 넣지 않습니다.

`read_resume_selection`은 고른 원소 중 id가 있는 노드를 JSON으로 반환합니다. 각 노드는 섹션, 이름, 자신의 원문, `sourceRefs`, `visibility`를 유지하고 자식의 원문도 그대로 둡니다. `visibility` 속성이 없으면 빈 문자열입니다. 선택하지 않은 원소는 빠지고, 비공개 원소를 응답에서 지우지 않습니다.

`generate_resume`의 역할 문구 소유자는 `apps/backend/src/modules/resume/generation/run-resume-harness.ts`의 `resumeWriterPersona`입니다. 새 생성은 선택한 모든 양식 섹션을 한 번의 모델 요청에 모아 문장·출처 ID·원문 인용 근거를 받습니다. `check-resume-evidence.ts`가 기존 구조 검사와 출처별 인용 구절 일치를 내부 검증하고 `validationMode: source_evidence`로 범위를 표시합니다. 별도 의미 검증 모델은 호출하지 않으며, 인용 구절 일치가 문장 전체의 의미를 증명한다고 표시하지 않습니다. 직접 `claims`를 제출할 때도 근거가 필요하며 모델은 호출하지 않습니다.

새 생성의 응답 스키마는 `evidence.quote` 후보를 선택된 원문 필드의 구절 목록으로 제한합니다. 모델은 구절을 선택하고, 내부 검사는 해당 출처의 인용 일치를 계속 확인합니다. 원문과 기존 모델 응답을 자동 교정하거나 유사 문자열로 통과시키지 않습니다.

숫자 근거 검사는 같은 연·월·일의 ISO 표기와 한글 표기를 정규화하되 날짜 구성은 묶어서 비교합니다. 단위 없는 숫자에 `년`·`개월`·`명`을 인정하는 것은 인용이 해당 구조화 필드(`birthYear`, `start`, `end`, `memberCount`, `reportedYears`, `reportedMonths`)의 전체 값과 일치할 때뿐입니다. 임의 숫자의 단위 제거, 값 변경, 연차 재계산은 하지 않습니다. 원본의 `unit`은 선택 스냅샷과 모델 입력에 보존하며, `unit="person"`인 구조화 필드 값을 직접 인용한 경우에만 인원 단위를 인정하고 정수의 `만명`·`억명` 표현을 같은 인원수로 비교합니다. `status`는 현재 기준값이 아닌 `superseded`일 때만 선택 스냅샷에 보존하며, 품질 평가는 이 노드를 필수 사실로 요구하지 않습니다. 다른 속성 전체를 선택 응답에 복사하지 않습니다. 단위가 없던 이전 스냅샷에 현재 원문을 다시 조회해 단위를 보충하지 않습니다. 거절 문장의 위치·항목·비교값은 `diagnostics`로 반환하고 아카이브에도 보관합니다.

`bootstrap/server.ts`는 모델 호출 전에 실제 활성 설정의 공급자·모델명만 전달하고 `resume-generation-store.ts`가 생성별로 보관합니다. 아카이브는 `model`과 검증의 `status`·`diagnostics`를 누적 저장하며, PDF 실행도 보관된 모델 정보를 사용하고 설정을 다시 조회하지 않습니다. 생성 작업의 `completed`는 검증 통과와 다르며 관리 화면은 검증 차단을 별도로 안내합니다. 모델 미기록 아카이브의 상단 `AI 사용 모델` 항목은 `기록 없음`으로 표시합니다.

`modules/resume/generation/resume-generation-store.ts`는 HTTP 서버 인스턴스 수명의 메모리 저장소입니다. introspection에서 받은 요청자 `sub`와 서버 실행 환경별로 최신 생성 건 한 개만 보관합니다. 원본 모델 요청(persona·prompt·responseFormat), 모델이 반환한 JSON 문자열과 서버 소유 소스·양식 스냅샷을 저장하며 키·토큰은 저장하지 않습니다. 원본은 파싱 전에 저장하므로 파싱·검증·PDF 실패 후에도 남습니다. 모델 공급자의 HTTP 응답 전체가 아니라 이력서 생성 응답 문자열을 보관합니다.

새 생성 입력을 접수하면 이전 원문·스냅샷과 ID를 모델 호출 전에 즉시 초기화합니다. 새 생성 실패 시 이전 결과를 복구하지 않으며, 늦게 끝난 이전 모델·PDF 작업도 이전 결과를 다시 저장하거나 반환하지 못합니다. `generate_resume`에 `generationId`만 전달하면 보관 원문에서 내부 검증만 재실행합니다. `convert_resume_to_pdf`도 `generationId`만 받아 같은 원문·스냅샷으로 내부 검증 후 PDF를 만들며 모델·원문 조회 API를 호출하지 않습니다. 클라이언트가 보내는 `generatedResume`, 수정한 본문·claims·selection은 받지 않습니다. `interpretation` 기반 외부 재작성 안내도 새 도구 입력 계약에서 제외합니다.

성공 응답과 생성 중 오류에는 `generationId`가 포함됩니다. 원문 수신 전에는 `GENERATION_NOT_READY`, 다른 사용자·환경·이전 ID·없는 결과에는 `GENERATION_NOT_FOUND`, 요청자 식별·환경이 없는 실행에는 `GENERATION_CONTEXT_REQUIRED`를 반환합니다. 메모리는 프로세스 종료·배포·Cloud Run 인스턴스 교체 시 사라지고 다른 인스턴스와 공유되지 않습니다. 결과가 없어도 모델을 자동 재호출하지 않습니다.

Supabase 연결이 설정되면 `modules/resume/archive/resume-debug-archive.ts`가 입력 스냅샷·모델 요청·파싱 전 응답·검증·실패 코드를 비공개 버킷의 `debug/resume/{environment}/{subjectHash}/{generationId}/{attemptId}/`에 단계별 JSON으로 보관합니다. 기록은 현재 메모리와 독립적이며 이전 메모리 ID를 복구하지 않습니다. 모델 원문을 메모리에 먼저 저장하고 외부 기록 저장 완료 후 파싱하므로 Storage 장애에도 받은 원문은 메모리에 남습니다. 기록 저장 실패는 `DEBUG_STORAGE_FAILED`로 표시하며 서버 키와 인증 헤더는 기록에 포함하지 않습니다. 자동 정리와 보관 기간은 후속 작업으로 둡니다. 세부 계약은 `docs/environment.md`를 따릅니다.

지원 공급자는 `openrouter`, `openai`, `gemini`입니다. OpenAI는 Chat Completions, Gemini는 Google의 OpenAI 호환 Chat Completions 엔드포인트에 직접 연결합니다. 공통 전송·응답 검증·오류 변환은 `infrastructure/ai/chat-completion-model-connection.ts`가 소유하고 OpenRouter의 `provider.require_parameters`는 OpenRouter 어댑터만 전달합니다. 관리 화면의 공급자 옵션과 기본 주소는 `apps/console/src/pages/ai-models/providers/model-providers.ts`의 `MODEL_PROVIDERS`가 모델 ID 예시·공식 모델 목록 링크와 함께 소유합니다. 공급자 추가는 실제 모델 설정을 자동 등록·활성화하지 않습니다. #180에서는 실제 모델 등록·활성화·실호출은 OpenAI만 수행하고 Gemini는 가짜 네트워크로 검증합니다.

동적 AI 모델은 `bootstrap/server.ts`의 `resumeModelFromSetting`이 소유합니다. 새 생성 요청에만 클라이언트를 만들고 유일한 `generate` 호출에서 활성 설정을 한 번 조회합니다. 기존 생성의 재검증과 PDF 변환은 클라이언트를 만들거나 활성 설정을 다시 조회하지 않습니다. `infrastructure/portfolio-api/resume-model-setting.ts`가 `RESUME_MODEL_SETTING_TOKEN`으로 환경의 활성 설정(`provider`, `modelName`, `url`, `apiKey`)을 portfolio-api에서 조회합니다. 모델 설정과 실제 키의 저장·관리는 portfolio-api가 소유하며 MCP는 읽은 키를 해당 요청의 모델 클라이언트에만 전달합니다. 모델 키를 위한 Secret Manager·ADC 연결은 사용하지 않습니다. 관리 화면 목록에는 키 원문 대신 등록 여부만 보여주고 입력은 API에 전달합니다.

`RESUME_MODEL_URL`, `RESUME_MODEL_TOKEN`, `RESUME_MODEL_PROVIDER`, `RESUME_MODEL_NAME`을 프로세스 환경에서 읽는 이전 경로는 제거했습니다. 설정·키 조회 실패나 알 수 없는 공급자이면 오류 코드만 반환하고 모델을 호출하지 않으며 정적 환경 모델로 대체하지 않습니다. `RESUME_MODEL_SETTING_URL`·`RESUME_MODEL_SETTING_TOKEN`·`RESUME_MODEL_ENVIRONMENT`는 정적 조회 연결 정보로 필수입니다.

`check_resume_draft`는 같은 선택 결과로 초안 문장을 검사합니다. 각 문장은 `text`와 `sourceIds`를 가집니다. 근거 id가 모두 선택 안에 있고 그 노드나 자식에 원문이 있으면 문장과 함께 그 원소의 원문, 출처, 공개 여부를 유지합니다. 근거 id가 없거나 선택에 없거나 노드와 자식의 원문이 모두 비어 있으면 그 문장은 누락입니다. 같은 원소 id에 서로 다른 문장이 오면 하나를 고르지 않고 충돌로 둡니다. 공개 여부가 빈 문자열인 근거는 확인 대상이고 값을 공개로 바꾸지 않습니다. 비공개 원문은 지우지 않습니다.

`render_resume_template`는 원소 이름과 원문을 출력합니다. 같은 원소 이름이 연속되면 이름을 한 번만 쓰고 값은 `- ` 불릿으로 묶습니다. 한 번만 있는 값은 `이름 원문`입니다. 원문 내부의 띄어쓰기는 유지합니다.

`render_resume_form`의 항목명과 섹션 제목은 `apps/backend/src/modules/resume/render/render-resume-form.ts`에 있습니다.

- 같은 항목명이 연속되면 항목명을 한 번만 쓰고 값은 `- ` 불릿으로 묶습니다.
- 기간은 `기간 시작 ~ 종료` 한 줄입니다. 비어 있는 쪽은 뺍니다.

## 관리자 화면

`apps/console/`은 `/admin/ai-models` 관리자 화면의 React + Vite 앱입니다. `pnpm build`가 서버 TypeScript와 앱을 함께 빌드해 `apps/console/dist`에 정적 파일을 만들고, 서버(`apps/backend/src/interfaces/admin/http/admin-routes.ts`)가 이를 서빙합니다. OAuth 로그인, PKCE, 세션 쿠키는 서버가 맡으며 앱은 토큰을 다루지 않고 `/admin/ai-models/api/*`만 호출합니다.

- 앱 소스 파일은 케밥 케이스(`login-page.tsx`)이고 컴포넌트 이름은 PascalCase입니다. 테스트는 대상 파일 옆에 둡니다.
- 콘솔 테스트는 `pnpm test:console`(Vitest)로 실행합니다. MCP Jest는 콘솔을 수집하지 않고 상위 웹 Jest는 `mcp/` 전체를 수집하지 않습니다.
- 설정별 연결 테스트는 `POST /admin/ai-models/api/settings/:id/test`(본문 `{ environment }`)가 맡습니다. 세션, 같은 출처, 메서드를 기존 API 경로와 같은 흐름으로 검사한 뒤 `apps/backend/src/modules/ai-models/setting-connection-test.ts`가 portfolio-api 목록(`/service/resume-model-setting`)에서 요청한 id와 환경이 모두 맞는 설정만 골라 그 설정의 `apiKey`로 `apps/backend/src/infrastructure/ai/test-model-connection.ts`를 실행합니다. 활성 설정이나 다른 설정으로 대체하지 않고, 설정을 만들거나 바꾸거나 활성화하지 않습니다. 모델에는 고정된 최소 입력만 보내며 이력서 원문은 보내지 않습니다. 호출은 두 번입니다. 먼저 일반 호출을 보내고, 성공하면 이력서 생성이 쓰는 `json_schema` 형식(`{ status: string }`)으로 한 번 더 보내 구조화 응답을 쓸 수 있는지 확인합니다. 일반 호출이 실패하면 두 번째는 보내지 않습니다. 응답은 `{ ok: true, latencyMs, response, structured }` 또는 `{ ok: false, code }`입니다. `response`와 `structured.response`는 공급자 응답 원문이고, `structured`는 `{ ok: true, latencyMs }` 또는 `{ ok: false, code }`(`STRUCTURED_INVALID`는 응답이 약속한 JSON이 아닌 경우)입니다. 구조화 확인이 실패해도 연결은 성공으로 두며 구조화 결과에만 코드를 담습니다. 연결 실패 코드는 키 미등록(`API_KEY_MISSING`), 인증 실패(`MODEL_AUTH_FAILED`), 공급자 오류와 호출 한도(`MODEL_PROVIDER_ERROR`), 요청 거부(`MODEL_REJECTED`), 시간 초과(`MODEL_TIMEOUT`)로 구분합니다. 응답 원문은 브라우저로 나가므로 API 키가 섞여 있으면 `[REDACTED]`로 가리고 8,000자를 넘으면 앞 2,000자만 `{ truncated, preview }`로 남깁니다. 키, 주소, 공급자 오류 원문은 응답과 로그(`ADMIN_MODEL_TEST`)에 남기지 않습니다. 모델 호출은 호출마다 15초 제한이 있고 자동 반복하지 않으며 버튼을 눌렀을 때만 실행합니다. 주소가 `https`가 아니거나 키가 없거나 공급자를 모르면 요청을 보내지 않습니다.
- 관리자 메뉴의 구성과 항목 정보(도메인, 이름, 설명, 경로)는 `packages/admin-contracts/src/admin-menu.ts` 한 곳에서만 정의합니다. 서버와 콘솔은 `@portfolio-mcp/admin-contracts` 공개 진입점으로 같은 정의를 가져오므로 다른 모듈을 import하지 않는 순수 데이터로 유지합니다. 로그인 뒤 기본 이동지는 메뉴 화면(`/admin`)이고, 로그인 전에 가려던 화면(`next`)으로 돌아가는 허용 목록은 이 정의에서 경로가 있는 항목으로 만듭니다. 경로가 없는 항목은 메뉴 화면에 "준비 중"으로만 보이며 이동·복귀 대상이 아닙니다. 화면 경로는 서버(`admin-routes.ts`)가 이 정의에서 일괄 등록해 세션 확인과 `next` 복귀를 공통으로 처리하므로 경로마다 라우트를 따로 쓰지 않습니다. 새 관리 화면은 이 정의에 항목을 추가하고, 관리자 앱의 `apps/console/src/app.tsx` `pageRegistry`에 같은 항목 ID로 화면을 등록하는 두 가지로 만듭니다. 화면은 `React.lazy`로 가져와 들어갈 때만 내려받으며(이름 있는 export는 `default`로 맞춥니다), 도착 전에는 현재 위치와 로딩 스피너를 보여줍니다. 모든 조회 중 표시는 `shared/ui/loading-spinner.tsx`의 `LoadingSpinner`(동그란 회전 표시) 하나를 쓰며, 문구(예: "화면을 불러오는 중입니다.")는 보이지 않게 두고 보조 기술에만 읽힙니다. 회전은 `prefers-reduced-motion`에서 끕니다. 청크 파일 이름은 서버 에셋 경로(`[A-Za-z0-9._-]`, `.js`·`.css`)에 맞아야 합니다. 화면 이동은 전체 페이지 로드라서 `ui/navigation-progress.tsx`가 링크·폼 이동 중 상단 진행 표시를 보여주고, 본문 진입 애니메이션과 `@view-transition`은 `styles.css`에 있으며 `prefers-reduced-motion`에서는 끕니다. 화면이 쓰는 API 경로는 `/admin/<화면 경로>/api/*` 규칙을 따릅니다(기존 모델 설정 API는 예외). 상단에는 메뉴 링크와 현재 위치(도메인 › 항목)만 보이고 화면 이동은 메뉴 화면에서 합니다. 서버 루트(`GET /`)는 세션 확인 없이 `/admin`으로 303 리다이렉트만 하며 화면을 직접 서빙하지 않습니다. 인증·정적 경로(`/admin/ai-models/connect`, `oauth/*`, `logout`, `assets`)는 메뉴와 무관하며 이름을 바꾸면 portfolio-api OAuth 콜백 등록도 바뀌어야 합니다.
- 이력서 도구 관리(#179)는 `/admin/tools/resume` 화면과 `/admin/tools/resume/api/` 아래 API가 맡습니다. `GET tools`(목록)와 `POST call`(실행)이 있으며 목록의 각 도구에는 시험용 `sampleArguments`가 붙습니다. 샘플의 소유자는 `apps/backend/src/interfaces/tools/resume/resume-tool-samples.ts`이고 가상의 인물·회사 자료이며 실제 이력서 원문을 쓰지 않습니다. 샘플은 `/mcp`의 `tools/list`에는 넣지 않고 `bootstrap`이 관리자 목록에만 붙이며, `generate_resume` 샘플은 직접 제출한 문장(`claims`)이라 모델을 호출하지 않습니다. `convert_resume_to_pdf` 샘플은 `generationId` 안내문만 두므로 `generate_resume` 응답의 ID로 바꿔 실행합니다. 도구 이름·설명·입력 스키마는 `handle-mcp-request.ts`의 `resumeToolDefinitions`가 유일한 소유자입니다. `bootstrap/create-resume-mcp-server.ts`가 이 목록을 관리자 라우트에 주입하므로 `interfaces/admin`은 `interfaces/tools`를 직접 가져오지 않고, 화면은 서버가 준 정의를 복제하지 않고 그대로 보여줍니다. 세션 확인은 디버그 아카이브 API와 같은 방식(쿠키, introspect, `session.active`)이며 읽을 때마다 `ADMIN_TOOLS sub= action= result=`만 로그에 남깁니다. `POST call`은 본문 `{ name, arguments }`를 같은 출처에서만 받고(최대 1MB) 세션 확인 뒤 `bootstrap`이 주입한 `runTool`로 실행합니다. `runTool`은 `/mcp`의 `tools/call`과 같은 `dispatch`(모델 선택·생성 맥락)를 쓰므로 도구 계약과 오류 코드가 같습니다. 새 `generate_resume`만 모델을 호출하며 사용자가 실행 버튼을 눌렀을 때만 실행하고 자동 반복하지 않습니다. 응답은 `{ isError, content }`이고 PDF 같은 바이너리 본문은 `uri`·`mimeType`·`byteLength`만 돌려줍니다. 로그는 `ADMIN_TOOLS sub= action=call tool= result=ok|error|failed`만 남기고 인자와 결과 본문은 남기지 않습니다. `POST policy`(본문 `{ name, enabled }`, 같은 출처)는 도구를 켜고 끄며, `GET tools`는 서버의 환경(`environment`: `development` 또는 `production`, 화면 제목 옆 배지)과 함께, 정책을 읽을 수 있을 때 도구마다 `enabled`와 `policyAvailable: true`를 싣고 정책이 없거나 읽지 못하면 `enabled`를 싣지 않습니다. 활성 정책의 소유자는 `apps/backend/src/modules/resume/tool-policy/resume-tool-policy.ts`이고 저장 위치(`tools/resume/{environment}/policy.json`), 10초 캐시, 읽기 실패 동작은 `docs/environment.md`가 적습니다. `handleMcpRequest`는 `/mcp`만 정책을 넘겨 끈 도구를 `tools/list`에서 빼고 `tools/call`을 `TOOL_DISABLED`로 거절하며(정책 읽기 실패는 `TOOL_POLICY_UNAVAILABLE`), 관리 화면의 시험 실행은 정책 없이 호출합니다. Supabase 설정이 없으면 정책도 없어 모든 도구가 활성입니다. 프리셋은 관리자 공용이며 `GET presets?tool=`(목록), `POST presets`(저장, 본문 `{ toolName, label, arguments }`), `POST presets/delete`(본문 `{ toolName, id }`)가 맡고 세션·같은 출처·메서드를 다른 도구 API와 같은 흐름으로 검사합니다. 소유자는 `apps/backend/src/modules/resume/tool-presets/resume-tool-presets.ts`이고 `bootstrap`이 주입하며 Supabase 설정이 없으면 `TOOL_PRESETS_UNAVAILABLE`(503)입니다. 저장 시점의 입력 인자를 바꾸지 않고 그대로 저장하며 불러오면 같은 값으로 복원합니다. 이력서 XML 원문은 저장하지 않으므로 인자의 `xml`은 그 도구의 샘플(가상 자료) XML과 완전히 같을 때만 허용하고 다르면 `PRESET_XML_NOT_ALLOWED`(400)로 거절합니다(조용히 제거하거나 바꾸지 않습니다). 샘플 XML의 소유자는 `resume-tool-samples.ts`이고 `bootstrap`이 주입합니다. 이름 60자, 인자 64KB, 도구당 30개를 넘으면 거절합니다. 삭제는 화면의 확인 단계를 거치고 저장소가 지웠다고 알린 경로만 성공으로 봅니다. 로그는 `action=preset_list|preset_save|preset_delete tool= result=`만 남기고 이름과 인자는 남기지 않습니다. 포트폴리오 툴 관리 항목은 포트폴리오 MCP가 생길 때까지 준비 중입니다.
- 이력서 디버깅 아카이브 조회(#186)는 `/admin/debug/resume` 화면과 `/admin/debug/resume/api/` 아래 API가 맡습니다. 조회는 `GET archives`(목록), `archives/detail`(상세), `archives/file-url`(서명 URL)입니다. 세션 확인은 `/admin/ai-models`와 같은 함수를 쓰며 `session.active`만 봅니다. 별도 관리자 역할 검사는 없고 portfolio-api가 세션 발급을 소유합니다. Supabase 설정(`SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `MCP_STORAGE_BUCKET`)이 있을 때만 켜지며 없으면 `DEBUG_ARCHIVE_UNAVAILABLE`(503)입니다. 소유자는 `apps/backend/src/modules/resume/archive/resume-debug-archive-reader.ts`입니다. 목록은 폴더 이름과 단계 파일명, Storage가 주는 생성 시각만으로 만들어 본문을 읽지 않고 시작 시각 내림차순(같으면 실행 ID 순)으로 정렬합니다. 상세는 마지막 단계 기록을 저장된 그대로 반환하고, 서명 URL은 실행 폴더에 있는 단계 파일만 300초 동안 발급합니다. 읽기마다 `ADMIN_DEBUG_ARCHIVE sub= action= result=`를 로그에 남기며 ID·서명 URL·오류 원문은 넣지 않습니다.
- 같은 경로의 쓰기 API는 모두 POST이며 같은 출처에서만 받습니다(본문 최대 4MB). `archives/revisions`는 수정본 저장, `archives/reproductions`는 재현, `archives/delete`는 삭제이고, 수정본은 `revisions`·`revision`, 재현 기록은 `reproductions` GET으로 조회합니다. 소유자는 수정본·삭제가 `resume-debug-archive-writer.ts`, 재현이 `reproduce-resume-archive.ts`이며 `resume-debug-archive-admin.ts`가 조회와 함께 묶어 라우트에 전달합니다.
- 수정본은 `…/{실행 ID}/revisions/{revisionId}.json`에 별도 객체로 저장하며 원본 단계 파일은 덮어쓰지 않습니다(같은 경로 쓰기는 Storage가 거부합니다). 저장 전에 응답이 `parseClaims`로 읽히는 JSON인지, 모든 `sourceIds`와 `evidence.sourceId`가 보관된 스냅샷의 원소 ID인지, 요청 페이로드에 `persona`·`prompt` 문자열이 있는지, 기준 파일이 그 실행의 단계 파일인지, 응답이 100만 자 이하인지 확인하고 아니면 코드(`INVALID_RESPONSE` 등, 422)로 거부합니다.
- 재현은 보관된 스냅샷과 선택한 원본·수정본 응답으로 `completeResumeGeneration`(내부 검증)과 `createResumePdf`만 실행합니다. 모델 클라이언트나 원문 API를 인자로 받지 않으며, 외부 모델로 새로 생성하는 동작은 이 API에 없고 `generate_resume`의 별도 요청으로만 합니다. PDF 사전 조건은 `convert_resume_to_pdf`와 같은 `assertResumePdfReady`를 씁니다. 결과는 성공과 실패 모두 `…/reproductions/{reproductionId}.json`에 기록하고 PDF 본문은 기록하지 않으며 응답의 `pdfBase64`로만 내려 줍니다. PDF가 `maxPdfResponseBytes`(5MB)를 넘으면 본문을 싣지 않고 `pdfOmitted: true`로 알리며 크기는 기록의 `pdf.byteLength`에 있습니다. 같은 실행·원본·동작을 이미 실행 중이면 `REPRODUCTION_IN_PROGRESS`(409)입니다. 이 잠금은 `…/{실행 ID}/locks/{원본}-{동작}.json` 객체를 `putJson`으로 잡아 인스턴스가 여럿이어도 유효하며, 같은 경로에는 다시 쓸 수 없다는 Storage의 성질을 이용합니다. Storage 어댑터가 "이미 있음"을 `STORAGE_OBJECT_EXISTS`로 다른 쓰기 오류와 구분해 알리고, 다른 오류는 실행 중으로 오해하지 않고 그대로 전합니다. 2분이 지난 잠금은 만료로 보고 치우며 잠금은 재현이 끝나면 풀립니다.
- 삭제는 요청의 `confirm`이 대상 실행 ID와 같을 때만 그 실행 폴더(단계 파일, `revisions`, `reproductions`) 안의 객체를 지웁니다. Storage가 지웠다고 응답한 경로와 요청을 비교해 하나라도 남으면 `DELETE_PARTIAL`(502)과 삭제·잔여 개수를 응답하고 성공으로 처리하지 않습니다. 자동 정리와 보관 기간은 후속 범위입니다.
- 아카이브 목록은 환경 전체 폴더를 훑은 뒤 정렬하고 자르므로 Storage 호출 수가 실행 수에 비례합니다. 폴더는 단계마다 동시에 `archiveListConcurrency`(8)개까지 병렬로 조회해 지연을 줄이고, 생성 ID·실행 ID 필터는 일치하지 않는 폴더를 열지 않아 호출을 줄입니다. 자동 정리가 후속 범위라 보관량이 늘어 목록이 느려지면 DB 목록 인덱스를 검토합니다.
- 이력서 품질 대시보드(`/admin/resume-quality`)는 `GET /admin/resume-quality/api/dashboard`가 평가 기록과 지표별 건수를 내려주고, 화면은 `apps/console/src/pages/resume-quality/`가 소유합니다. 화면은 기록별 목록 없이 선택한 환경의 전체 기록을 합산한 통계만 보여주며, `quality-api.ts`의 `listAllResumeQualityDashboard`가 `GET /admin/resume-quality/api/dashboard/all`을 한 번만 호출합니다. 서버는 `resume-quality-dashboard-reader.ts`의 `summarize`로 환경 폴더를 한 번만 훑고 최근 실행 `maxQualityDashboardArchives`(300)개까지만 평가를 읽으며, 상한에 닿으면 `truncated`와 읽은 실행 수 `archivesScanned`로 알립니다. 아카이브 목록(`list`)과 합산(`listAll`)은 `collectSummaries` 한 곳에서 환경 폴더를 훑으므로 페이지 수만큼 다시 훑지 않습니다. 집계(요약·지표별·추이)는 `quality-stats.ts` 한 곳에서만 계산하고, 지표 목록은 `sortByRateDesc`로 모든 곳에서 통과율이 높은 순서로 같게 정렬합니다(추이 차트의 색은 지표 이름에 묶여 있어 정렬과 무관하게 `metricBreakdown`의 처음 나온 순서를 따릅니다). 판정 구성 막대는 조각에 마우스를 올리면 건수와 퍼센트를 말풍선으로 보여줍니다. 통과율은 통과 건수를 전체 검사 건수(통과+실패+검토 대기+측정 실패)로 나눈 값이며 백엔드의 `lowerBound`와 같습니다. 지표 ID의 한글 이름과 쉬운 설명, 판정 용어 설명은 `quality-glossary.ts`가 소유하고 `quality-guide.tsx`가 화면 안내로 보여줍니다. 차트는 Recharts(`recharts`, 이 화면의 lazy 청크에만 포함)와 직접 그린 누적 막대를 쓰고, 지표별 색은 `chart-colors.ts`의 고정 순서를 따릅니다. 판정 상태 색에는 기호와 이름을 함께 붙이고, 모든 차트 수치는 `수치를 표로 보기`의 표와 같은 값으로 제공합니다. 테스트에서 차트가 그려지려면 `src/test/chart-size.ts`의 `stubChartSize`로 컨테이너 크기를 알려야 합니다. 아카이브 목록은 `quality-reviews` 폴더를 실행 폴더로 보지 않습니다(`qualityReviewsDirectoryName`).
- 원문이 있는 Storage 버킷은 비공개여야 합니다. `storage.assertBucketPrivate()`가 버킷 설정을 확인하고(값을 알 수 없으면 공개로 봅니다), 배포 뒤 `pnpm check:storage`(개발)·`pnpm check:storage:prod`(운영)로 점검합니다. 이 점검은 빌드 산출물(`dist`)을 쓰므로 `pnpm build` 뒤에 실행하고 출력은 성공 또는 실패 코드뿐입니다.
- CSP가 `script-src 'self'`이므로 인라인 스크립트를 두지 않습니다. 리퍼러 정책은 `same-origin`을 유지합니다. `no-referrer`면 브라우저가 폼 POST에 `Origin: null`을 보내 로그인 시작이 항상 거절됩니다.

## 에이전트별 진입점

| 에이전트       | 자동으로 읽는 파일                      |
| -------------- | --------------------------------------- |
| Cursor         | `AGENTS.md`, `.cursor/rules/agents.mdc` |
| Codex          | `AGENTS.md`                             |
| Claude Code    | `CLAUDE.md` (`@AGENTS.md` 포함)         |
| Gemini CLI     | `GEMINI.md` (`@AGENTS.md` 포함)         |
| GitHub Copilot | `.github/copilot-instructions.md`       |

진입점 파일에는 내용을 늘리지 않습니다. 지침은 이 파일에서만 수정합니다.
