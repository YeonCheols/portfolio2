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

| 프로세스   | 소스                        | 실행 파일                    |
| ---------- | --------------------------- | ---------------------------- |
| 이력서 MCP | `src/resume/http/server.ts` | `dist/resume/http/server.js` |

이후 포트폴리오 MCP는 `src/portfolio/`에 둡니다. `resume` 내부를 가져오지 않습니다. 디렉터리는 그 작업이 시작될 때 만듭니다.

## 디렉터리

```text
mcp/
├── AGENTS.md                     이 지침의 원본
├── CLAUDE.md                     Claude Code 진입점
├── GEMINI.md                     Gemini CLI 진입점
├── .cursor/rules/agents.mdc      Cursor 진입점
├── .github/copilot-instructions.md  GitHub Copilot 진입점
├── docs/oauth-gateway.md         인증과 배포
├── app/                          관리자 화면(React + Vite). 빌드 결과는 dist/auth/app
├── src/runtimeBoundary.test.ts   웹 앱 이력서 소스를 직접 가져오지 않는지 검사
└── src/resume/
    ├── model/                    공통 이력서 모델 타입
    ├── compose/                  elementIds와 sectionOrder로 원소를 고르고 순서를 맞춤
    ├── output/                   선택한 모델의 출력. 미리보기, 원소 이름 템플릿, 이력서 양식
    ├── tools/                    MCP 도구 이름과 JSON-RPC 처리
    ├── http/                     이력서 MCP HTTP 서버와 프로세스 진입점
    ├── connection/               외부 연결: shared(공통 계약), resume(이력서 조회), model(AI 모델)
    └── testing/                  테스트 fixture. 실행 코드가 가져오지 않음
```

`src/storage/`는 도메인에 종속되지 않는 MCP 공통 Storage 연결을 소유합니다. `MCP_STORAGE_BUCKET`은 공통 버킷 이름이며 `debug/resume/` 같은 하위 경로는 소비 도메인이 소유합니다.

외부 연결은 다음 역할과 도메인으로 나눕니다. 테스트는 이동한 구현 파일 옆에 유지합니다.

- `connection/shared/`: 공통 오류, fetch·옵션 타입과 JSON POST 계약을 소유합니다.
- `connection/resume/`: 이력서 데이터 조회의 입력과 API 호출을 소유합니다.
- `connection/model/`: AI 모델 호출 계약, Chat Completions 공통 처리, 활성 모델 설정 조회와 연결 진단을 소유합니다.
- `connection/model/providers/`: OpenRouter·OpenAI·Gemini 공급자 어댑터를 소유합니다.

의존은 `model`에서 `compose`와 `output`으로, 그다음 `tools`, `http` 순서로만 갑니다. 테스트는 대상 파일 옆에 둡니다. MCP 내부 모듈은 `@mcp/...` alias로 가져옵니다. 상대경로는 쓰지 않습니다. alias 정의는 `tsconfig.json`의 `@mcp/*`에 있습니다. 빌드 결과는 Node가 읽을 수 있도록 `@mcp` 경로를 상대경로로 바꿉니다.

## 도구

도구 목록의 소유자는 `src/resume/tools/handleMcpRequest.ts`입니다. 동작의 소유자는 `src/resume/tools/resumeTools.ts`입니다. 선택 조합은 `composeResume` 결과를 사용합니다.

공통 인자:

- `source`는 `repository`, `embedded`, `file` 중 하나입니다. 그 외는 `INVALID_INPUT`입니다.
- `embedded`와 `file`은 `xml` 문자열이 필요합니다.
- `elementIds`와 `sectionOrder`는 문자열 배열입니다. 선택하지 않은 원소는 출력에서 빠집니다.
- `template`은 `기본형`, `경력 중심형`, `프로젝트 중심형`만입니다. 목록의 소유자는 `src/resume/model/resumeTemplate.ts`입니다. `render_resume_template`, `render_resume_form`, `read_resume_selection`, `check_resume_draft`, `generate_resume`가 이 목록을 함께 씁니다. 다른 이름은 `UNKNOWN_TEMPLATE`만 반환합니다.

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

없는 도구 이름은 `UNKNOWN_TOOL`입니다. 연결이 거부한 입력은 연결 오류 코드만 반환합니다. OpenRouter·OpenAI·Gemini 공급자가 비정상 상태로 응답하면 `chatCompletionModelConnection.ts`가 상태 코드로 오류 코드를 나눕니다. 401·403은 `MODEL_AUTH_FAILED`, 429와 5xx는 `MODEL_PROVIDER_ERROR`, 그 밖의 거부는 `MODEL_REJECTED`입니다. `generate_resume`도 같은 어댑터를 쓰므로 이 코드가 도구 응답의 연결 오류 코드로 그대로 전달됩니다. 공급자의 오류 본문은 읽지도 전달하지도 않습니다.

`render_resume_template`, `render_resume_form`, `read_resume_selection`, `check_resume_draft`, `generate_resume`는 `src/resume/output/selectTemplateSections.ts`의 같은 섹션 선택을 사용합니다.

- `기본형`은 프로필, 학력, 경력, 프로젝트 순서입니다.
- `경력 중심형`은 선택한 경력과, 그 경력에 `employmentRef`로 연결된 프로젝트만 보여 줍니다.
- `프로젝트 중심형`은 선택한 프로젝트와, 그 프로젝트가 가리키는 경력만 보여 줍니다.
- 이 네 섹션 밖은 이 출력들에 넣지 않습니다.

`read_resume_selection`은 고른 원소 중 id가 있는 노드를 JSON으로 반환합니다. 각 노드는 섹션, 이름, 자신의 원문, `sourceRefs`, `visibility`를 유지하고 자식의 원문도 그대로 둡니다. `visibility` 속성이 없으면 빈 문자열입니다. 선택하지 않은 원소는 빠지고, 비공개 원소를 응답에서 지우지 않습니다.

`generate_resume`의 역할 문구 소유자는 `src/resume/output/runResumeHarness.ts`의 `resumeWriterPersona`입니다. 새 생성은 선택한 모든 양식 섹션을 한 번의 모델 요청에 모아 문장·출처 ID·원문 인용 근거를 받습니다. `checkResumeEvidence.ts`가 기존 구조 검사와 출처별 인용 구절 일치를 내부 검증하고 `validationMode: source_evidence`로 범위를 표시합니다. 별도 의미 검증 모델은 호출하지 않으며, 인용 구절 일치가 문장 전체의 의미를 증명한다고 표시하지 않습니다. 직접 `claims`를 제출할 때도 근거가 필요하며 모델은 호출하지 않습니다.

`output/resumeGenerationStore.ts`는 HTTP 서버 인스턴스 수명의 메모리 저장소입니다. introspection에서 받은 요청자 `sub`와 서버 실행 환경별로 최신 생성 건 한 개만 보관합니다. 원본 모델 요청(persona·prompt·responseFormat), 모델이 반환한 JSON 문자열과 서버 소유 소스·양식 스냅샷을 저장하며 키·토큰은 저장하지 않습니다. 원본은 파싱 전에 저장하므로 파싱·검증·PDF 실패 후에도 남습니다. 모델 공급자의 HTTP 응답 전체가 아니라 이력서 생성 응답 문자열을 보관합니다.

새 생성 입력을 접수하면 이전 원문·스냅샷과 ID를 모델 호출 전에 즉시 초기화합니다. 새 생성 실패 시 이전 결과를 복구하지 않으며, 늦게 끝난 이전 모델·PDF 작업도 이전 결과를 다시 저장하거나 반환하지 못합니다. `generate_resume`에 `generationId`만 전달하면 보관 원문에서 내부 검증만 재실행합니다. `convert_resume_to_pdf`도 `generationId`만 받아 같은 원문·스냅샷으로 내부 검증 후 PDF를 만들며 모델·원문 조회 API를 호출하지 않습니다. 클라이언트가 보내는 `generatedResume`, 수정한 본문·claims·selection은 받지 않습니다. `interpretation` 기반 외부 재작성 안내도 새 도구 입력 계약에서 제외합니다.

성공 응답과 생성 중 오류에는 `generationId`가 포함됩니다. 원문 수신 전에는 `GENERATION_NOT_READY`, 다른 사용자·환경·이전 ID·없는 결과에는 `GENERATION_NOT_FOUND`, 요청자 식별·환경이 없는 실행에는 `GENERATION_CONTEXT_REQUIRED`를 반환합니다. 메모리는 프로세스 종료·배포·Cloud Run 인스턴스 교체 시 사라지고 다른 인스턴스와 공유되지 않습니다. 결과가 없어도 모델을 자동 재호출하지 않습니다.

Supabase 연결이 설정되면 `output/resumeDebugArchive.ts`가 입력 스냅샷·모델 요청·파싱 전 응답·검증·실패 코드를 비공개 버킷의 `debug/resume/{environment}/{subjectHash}/{generationId}/{attemptId}/`에 단계별 JSON으로 보관합니다. 기록은 현재 메모리와 독립적이며 이전 메모리 ID를 복구하지 않습니다. 모델 원문을 메모리에 먼저 저장하고 외부 기록 저장 완료 후 파싱하므로 Storage 장애에도 받은 원문은 메모리에 남습니다. 기록 저장 실패는 `DEBUG_STORAGE_FAILED`로 표시하며 서버 키와 인증 헤더는 기록에 포함하지 않습니다. 자동 정리와 보관 기간은 후속 작업으로 둡니다. 세부 계약은 `docs/environment.md`를 따릅니다.

지원 공급자는 `openrouter`, `openai`, `gemini`입니다. OpenAI는 Chat Completions, Gemini는 Google의 OpenAI 호환 Chat Completions 엔드포인트에 직접 연결합니다. 공통 전송·응답 검증·오류 변환은 `connection/model/chatCompletionModelConnection.ts`가 소유하고 OpenRouter의 `provider.require_parameters`는 OpenRouter 어댑터만 전달합니다. 관리 화면의 공급자 옵션과 기본 주소는 `app/src/settings/providers/model-providers.ts`의 `MODEL_PROVIDERS`가 모델 ID 예시·공식 모델 목록 링크와 함께 소유합니다. 공급자 추가는 실제 모델 설정을 자동 등록·활성화하지 않습니다. #180에서는 실제 모델 등록·활성화·실호출은 OpenAI만 수행하고 Gemini는 가짜 네트워크로 검증합니다.

동적 AI 모델은 `http/server.ts`의 `resumeModelFromSetting`이 소유합니다. 새 생성 요청에만 클라이언트를 만들고 유일한 `generate` 호출에서 활성 설정을 한 번 조회합니다. 기존 생성의 재검증과 PDF 변환은 클라이언트를 만들거나 활성 설정을 다시 조회하지 않습니다. `connection/model/resumeModelSetting.ts`가 `RESUME_MODEL_SETTING_TOKEN`으로 환경의 활성 설정(`provider`, `modelName`, `url`, `apiKey`)을 portfolio-api에서 조회합니다. 모델 설정과 실제 키의 저장·관리는 portfolio-api가 소유하며 MCP는 읽은 키를 해당 요청의 모델 클라이언트에만 전달합니다. 모델 키를 위한 Secret Manager·ADC 연결은 사용하지 않습니다. 관리 화면 목록에는 키 원문 대신 등록 여부만 보여주고 입력은 API에 전달합니다.

`RESUME_MODEL_URL`, `RESUME_MODEL_TOKEN`, `RESUME_MODEL_PROVIDER`, `RESUME_MODEL_NAME`을 프로세스 환경에서 읽는 이전 경로는 제거했습니다. 설정·키 조회 실패나 알 수 없는 공급자이면 오류 코드만 반환하고 모델을 호출하지 않으며 정적 환경 모델로 대체하지 않습니다. `RESUME_MODEL_SETTING_URL`·`RESUME_MODEL_SETTING_TOKEN`·`RESUME_MODEL_ENVIRONMENT`는 정적 조회 연결 정보로 필수입니다.

`check_resume_draft`는 같은 선택 결과로 초안 문장을 검사합니다. 각 문장은 `text`와 `sourceIds`를 가집니다. 근거 id가 모두 선택 안에 있고 그 노드나 자식에 원문이 있으면 문장과 함께 그 원소의 원문, 출처, 공개 여부를 유지합니다. 근거 id가 없거나 선택에 없거나 노드와 자식의 원문이 모두 비어 있으면 그 문장은 누락입니다. 같은 원소 id에 서로 다른 문장이 오면 하나를 고르지 않고 충돌로 둡니다. 공개 여부가 빈 문자열인 근거는 확인 대상이고 값을 공개로 바꾸지 않습니다. 비공개 원문은 지우지 않습니다.

`render_resume_template`는 원소 이름과 원문을 출력합니다. 같은 원소 이름이 연속되면 이름을 한 번만 쓰고 값은 `- ` 불릿으로 묶습니다. 한 번만 있는 값은 `이름 원문`입니다. 원문 내부의 띄어쓰기는 유지합니다.

`render_resume_form`의 항목명과 섹션 제목은 `src/resume/output/renderResumeForm.ts`에 있습니다.

- 같은 항목명이 연속되면 항목명을 한 번만 쓰고 값은 `- ` 불릿으로 묶습니다.
- 기간은 `기간 시작 ~ 종료` 한 줄입니다. 비어 있는 쪽은 뺍니다.

## 관리자 화면

`app/`은 `/admin/ai-models` 관리자 화면의 React + Vite 앱입니다. `pnpm build`가 서버 TypeScript와 앱을 함께 빌드해 `dist/auth/app`에 정적 파일을 만들고, 서버(`src/auth/adminRoutes.ts`)가 이를 서빙합니다. OAuth 로그인, PKCE, 세션 쿠키는 서버가 맡으며 앱은 토큰을 다루지 않고 `/admin/ai-models/api/*`만 호출합니다.

- 앱 소스 파일은 케밥 케이스(`login-page.tsx`)이고 컴포넌트 이름은 PascalCase입니다. 테스트는 대상 파일 옆에 둡니다.
- 앱 테스트는 `pnpm test`(Vitest)로 실행합니다. 루트 Jest는 `mcp/app/`을 실행하지 않습니다.
- 설정별 연결 테스트는 `POST /admin/ai-models/api/settings/:id/test`(본문 `{ environment }`)가 맡습니다. 세션, 같은 출처, 메서드를 기존 API 경로와 같은 흐름으로 검사한 뒤 `src/auth/settingConnectionTest.ts`가 portfolio-api 목록(`/service/resume-model-setting`)에서 요청한 id와 환경이 모두 맞는 설정만 골라 그 설정의 `apiKey`로 `src/resume/connection/model/testModelConnection.ts`를 실행합니다. 활성 설정이나 다른 설정으로 대체하지 않고, 설정을 만들거나 바꾸거나 활성화하지 않습니다. 모델에는 고정된 최소 입력만 보내며 이력서 원문은 보내지 않습니다. 호출은 두 번입니다. 먼저 일반 호출을 보내고, 성공하면 이력서 생성이 쓰는 `json_schema` 형식(`{ status: string }`)으로 한 번 더 보내 구조화 응답을 쓸 수 있는지 확인합니다. 일반 호출이 실패하면 두 번째는 보내지 않습니다. 응답은 `{ ok: true, latencyMs, response, structured }` 또는 `{ ok: false, code }`입니다. `response`와 `structured.response`는 공급자 응답 원문이고, `structured`는 `{ ok: true, latencyMs }` 또는 `{ ok: false, code }`(`STRUCTURED_INVALID`는 응답이 약속한 JSON이 아닌 경우)입니다. 구조화 확인이 실패해도 연결은 성공으로 두며 구조화 결과에만 코드를 담습니다. 연결 실패 코드는 키 미등록(`API_KEY_MISSING`), 인증 실패(`MODEL_AUTH_FAILED`), 공급자 오류와 호출 한도(`MODEL_PROVIDER_ERROR`), 요청 거부(`MODEL_REJECTED`), 시간 초과(`MODEL_TIMEOUT`)로 구분합니다. 응답 원문은 브라우저로 나가므로 API 키가 섞여 있으면 `[REDACTED]`로 가리고 8,000자를 넘으면 앞 2,000자만 `{ truncated, preview }`로 남깁니다. 키, 주소, 공급자 오류 원문은 응답과 로그(`ADMIN_MODEL_TEST`)에 남기지 않습니다. 모델 호출은 호출마다 15초 제한이 있고 자동 반복하지 않으며 버튼을 눌렀을 때만 실행합니다. 주소가 `https`가 아니거나 키가 없거나 공급자를 모르면 요청을 보내지 않습니다.
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
