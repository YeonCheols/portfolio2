# Copilot Instructions

이 저장소의 에이전트 지침 원본은 루트의 `AGENTS.md`입니다. 작업 전에 `AGENTS.md`를 읽고 따릅니다.

필수 규칙 요약 (상세 절차는 `.agents/skills/<name>/SKILL.md`):

- 코드 수정 시 `tdd` 스킬: 실패하는 테스트를 먼저 작성하고, 수정한 파일의 관련 테스트를 반드시 추가하거나 수정한다
- TDD는 요구·불변조건·소유자·테스트를 연결하고 실제 Red·Green 결과를 기록합니다. 통과 목적의 우회 분기를 금지하고 인접 경계를 검증합니다. 임시 근거 파일은 현재 작업이 만든 경로만 정리합니다.
- 커밋 시 `commit` 스킬: `<type>(<scope>): <소문자 또는 한글 제목>` 형식, 검증 후 선별 스테이징, 코드 변경은 커밋 직전 `review` 스킬(staged)로 리뷰하고 🔴 있으면 중단
- PR 생성 시 `pr` 스킬: `.github/pull_request_template.md` 형식, 담당자는 `gh` 활성 계정, 생성 후 `review` 스킬(branch) 결과를 PR 댓글로 작성
- 검증은 `qa` 스킬: `pnpm lint`, `pnpm format:check`, `pnpm type-check`, `pnpm test`. PR CI는 `.github/workflows/ci.yml`
- 코드 리뷰 기준은 `review` 스킬을 따릅니다. 댓글은 `.agents/skills/review/TEMPLATE.md`만 채웁니다. 목적·데이터 흐름·공통 소유권·불변조건을 검토하고 발견마다 코드·계약 근거와 기존 또는 필요한 회귀 테스트를 적습니다. 테스트 부재로 확인된 결함을 제외하지 않습니다. 중요한 로컬 검증 미확인은 차단 표시가 있는 검증 보류로 보고합니다. MCP 배포 및 배포 후 호출 확인은 비차단 후속 제안으로 기록합니다. 수정 후 최신 상태를 재검토하며 PR 자동 실행은 꺼 두고 `/review` 댓글로만 실행합니다.
- 이슈 생성 시 `issue` 스킬: 본문은 `.github/ISSUE_TEMPLATE.md`만 채운다. 예상, 변경범위, 코드, 1급 시민, 불변조건, TDD 기준 테스트 조건은 목록이다. 상태는 저장소 GitHub Project의 Status만 쓰고 값은 `ToDo`, `In Progress`, `Review`, `Done`이다. 새 이슈는 `ToDo`다. 라벨로 상태를 만들지 않는다. 제목과 본문 문장은 `~습니다` 또는 `~ㅂ니다`로 끝낸다. `~다`로 끝내지 않는다
- 이슈에는 관련 요구·댓글, 사실과 후보, 모델 소유권, 구현·테스트 경로와 검증 조건을 연결합니다. 요청된 하위 관계·Project·Status를 검증하고 부분 실패 시 같은 이슈를 재생성하지 않습니다.
- MCP 작업은 `mcp/AGENTS.md`를 따른다. 인증, 디렉터리, 도구 절차는 그 파일에만 두고 이 파일에 복사하지 않는다
- 근거를 남기는 문장은 `~습니다`로 끝낸다. 패키지 매니저는 pnpm
- `Lint, Typecheck, Test`, `Integration`, `review-gate`, `integration-gate`가 실패했거나 최신 리뷰에 🔴가 있으면 머지하지 않는다
- `master` 기준 작업 전에는 `git fetch origin`으로 `origin/master` 최신을 받는다
- 개발 서버는 자동으로 실행하지 않는다
- Fast는 기본으로 켜지 않는다. 필요한 파일만 읽고, 테스트는 바꾼 경로부터 실행한다. 작업이 끝나면 `목표: 15,000토큰`처럼 예산만 적는다. 소비와 확인 불가는 쓰지 않는다

이 파일과 `AGENTS.md`가 다르면 `AGENTS.md`를 따릅니다.
