# AGENTS.md

이 파일은 `mcp/`에서 작업하는 AI 에이전트의 지침 원본입니다. MCP를 별도 저장소로 분리할 때 이 파이프라인도 함께 옮깁니다. 진입점 파일에는 내용을 늘리지 않고 이 파일만 수정합니다.

웹 앱 저장소 안에 있을 때의 공통 스킬은 상위 `.agents/skills/<name>/SKILL.md`를 따릅니다. 코드 수정은 `tdd`, 커밋은 `commit`, PR은 `pr`, 검증은 `qa`, 리뷰는 `review`, 이슈는 `issue`입니다.

## 경계

- `mcp/`는 웹 앱 `src/`와 분리된 프로젝트입니다. 이력서 엔티티, `resume.xml`, `parseResumeXml`을 가져오지 않습니다.
- 인증서버와 OAuth 게이트웨이는 별도 Cloud Run 서비스이고 소스는 `src/auth/`, `src/gateway/`에 둡니다. 분리 시 인증서버와 게이트웨이도 함께 옮깁니다. 기존 `portfolio-mcp` 서비스는 비공개로 유지합니다.
- 인증·배포·클라이언트 연결 작업 전 [`docs/oauth-gateway.md`](docs/oauth-gateway.md)를 읽습니다.
- 토큰과 시크릿은 저장소, 클라이언트 설정, 로그에 남기지 않습니다. 연락처 원문은 이슈 본문과 로그에 넣지 않습니다.
- 사용자에게는 한국어로 답합니다. 근거를 남기는 문장은 `~습니다` 또는 `~ㅂ니다`로 끝냅니다.

## 프로세스

인증서버, 게이트웨이, 이력서 MCP는 서로 다른 Cloud Run 서비스입니다. `auth`와 `gateway`는 `resume`를 가져오지 않습니다.

| 프로세스         | 소스                        | 실행 파일                    |
| ---------------- | --------------------------- | ---------------------------- |
| 이력서 MCP       | `src/resume/http/server.ts` | `dist/resume/http/server.js` |
| OAuth 게이트웨이 | `src/gateway/server.ts`     | `dist/gateway/server.js`     |
| 인증서버         | `src/auth/server.ts`        | `dist/auth/server.js`        |

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
├── src/auth/                     인증서버. GitHub 로그인과 access token 발급
├── src/gateway/                  공개 게이트웨이. 토큰 검증 후 비공개 MCP로 전달
├── src/runtimeBoundary.test.ts   웹 앱 이력서 소스를 직접 가져오지 않는지 검사
└── src/resume/
    ├── model/                    공통 이력서 모델 타입
    ├── compose/                  elementIds와 sectionOrder로 원소를 고르고 순서를 맞춤
    ├── output/                   선택한 모델의 출력. 미리보기, 원소 이름 템플릿, 이력서 양식
    ├── tools/                    MCP 도구 이름과 JSON-RPC 처리
    ├── http/                     이력서 MCP HTTP 서버와 프로세스 진입점
    ├── connection/               이력서 모델 API 호출. http 진입점만 사용
    └── testing/                  테스트 fixture. 실행 코드가 가져오지 않음
```

의존은 `model`에서 `compose`와 `output`으로, 그다음 `tools`, `http` 순서로만 갑니다. 테스트는 대상 파일 옆에 둡니다. MCP 내부 모듈은 `@mcp/...` alias로 가져옵니다. 상대경로는 쓰지 않습니다. alias 정의는 `tsconfig.json`의 `@mcp/*`에 있습니다. 빌드 결과는 Node가 읽을 수 있도록 `@mcp` 경로를 상대경로로 바꿉니다.

## 도구

도구 목록의 소유자는 `src/resume/tools/handleMcpRequest.ts`입니다. 동작의 소유자는 `src/resume/tools/resumeTools.ts`입니다. 선택 조합은 `composeResume` 결과를 사용합니다.

공통 인자:

- `source`는 `repository`, `embedded`, `file` 중 하나입니다. 그 외는 `INVALID_INPUT`입니다.
- `embedded`와 `file`은 `xml` 문자열이 필요합니다.
- `elementIds`와 `sectionOrder`는 문자열 배열입니다. 선택하지 않은 원소는 출력에서 빠집니다.
- `template`은 `기본형`, `경력 중심형`, `프로젝트 중심형`만입니다. 목록의 소유자는 `src/resume/model/resumeTemplate.ts`입니다. `render_resume_template`와 `render_resume_form`이 이 목록을 함께 씁니다. 다른 이름은 `UNKNOWN_TEMPLATE`만 반환합니다.

| 도구                     | 하는 일                                                                |
| ------------------------ | ---------------------------------------------------------------------- |
| `validate_resume_xml`    | 모델을 읽고 이력서 id를 반환합니다.                                    |
| `list_resume_elements`   | 원소 id, 섹션, 이름, 출처만 JSON으로 반환합니다. 본문은 넣지 않습니다. |
| `preview_resume`         | 섹션 이름과 원문 줄만 이어 붙입니다. 원소 이름은 붙이지 않습니다.      |
| `render_resume_template` | 원소 이름과 원문을 한 줄로 출력합니다.                                 |
| `render_resume_form`     | 한글 항목명과 원문으로 이력서 양식을 출력합니다.                       |

없는 도구 이름은 `UNKNOWN_TOOL`입니다. 연결이 거부한 입력은 연결 오류 코드만 반환합니다.

`render_resume_template`와 `render_resume_form`은 `src/resume/output/selectTemplateSections.ts`의 같은 섹션 선택을 사용합니다.

- `기본형`은 프로필, 학력, 경력, 프로젝트 순서입니다.
- `경력 중심형`은 선택한 경력과, 그 경력에 `employmentRef`로 연결된 프로젝트만 보여 줍니다.
- `프로젝트 중심형`은 선택한 프로젝트와, 그 프로젝트가 가리키는 경력만 보여 줍니다.
- 이 네 섹션 밖은 두 출력 모두에 넣지 않습니다.

`render_resume_template`는 원소 이름과 원문을 출력합니다. 같은 원소 이름이 연속되면 이름을 한 번만 쓰고 값은 `- ` 불릿으로 묶습니다. 한 번만 있는 값은 `이름 원문`입니다. 원문 내부의 띄어쓰기는 유지합니다.

`render_resume_form`의 항목명과 섹션 제목은 `src/resume/output/renderResumeForm.ts`에 있습니다.

- 같은 항목명이 연속되면 항목명을 한 번만 쓰고 값은 `- ` 불릿으로 묶습니다.
- 기간은 `기간 시작 ~ 종료` 한 줄입니다. 비어 있는 쪽은 뺍니다.

## 에이전트별 진입점

| 에이전트       | 자동으로 읽는 파일                      |
| -------------- | --------------------------------------- |
| Cursor         | `AGENTS.md`, `.cursor/rules/agents.mdc` |
| Codex          | `AGENTS.md`                             |
| Claude Code    | `CLAUDE.md` (`@AGENTS.md` 포함)         |
| Gemini CLI     | `GEMINI.md` (`@AGENTS.md` 포함)         |
| GitHub Copilot | `.github/copilot-instructions.md`       |

진입점 파일에는 내용을 늘리지 않습니다. 지침은 이 파일에서만 수정합니다.
