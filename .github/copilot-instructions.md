# Copilot Instructions

이 저장소의 에이전트 지침 원본은 루트의 `AGENTS.md`입니다. 작업 전에 `AGENTS.md`를 읽고 따릅니다.

필수 규칙 요약 (상세 절차는 `.agents/skills/<name>/SKILL.md`):

- 코드 수정 시 `tdd` 스킬: 실패하는 테스트를 먼저 작성하고, 수정한 파일의 관련 테스트를 반드시 추가하거나 수정한다
- 커밋 시 `commit` 스킬: `<type>(<scope>): <소문자 또는 한글 제목>` 형식, 검증 후 선별 스테이징, 코드 변경은 커밋 직전 `review` 스킬(staged)로 리뷰하고 🔴 있으면 중단
- PR 생성 시 `pr` 스킬: `.github/pull_request_template.md` 형식, 담당자는 `gh` 활성 계정, 생성 후 `review` 스킬(branch) 결과를 PR 댓글로 작성
- 검증은 `qa` 스킬: `pnpm lint`, `pnpm format:check`, `pnpm type-check`, `pnpm test`. PR CI는 `.github/workflows/ci.yml`
- 코드 리뷰 기준은 `review` 스킬. 댓글은 `.agents/skills/review/TEMPLATE.md`만 채우고 발견마다 TDD 근거를 적는다. PR 자동 실행은 꺼 두고 `/review` 댓글로만 실행한다
- 이슈 생성 시 `issue` 스킬: 본문은 배경, 예상, 변경범위, TDD 기준 테스트 조건이 있어야 한다. 제목과 본문 문장은 `~습니다` 또는 `~ㅂ니다`로 끝낸다. `~다`로 끝내지 않는다
- 근거를 남기는 문장은 `~습니다`로 끝낸다. 패키지 매니저는 pnpm
- CI가 실패했거나 최신 리뷰에 🔴가 있으면 머지하지 않는다
- `master` 기준 작업 전에는 `git fetch origin`으로 `origin/master` 최신을 받는다
- 개발 서버는 자동으로 실행하지 않는다

이 파일과 `AGENTS.md`가 다르면 `AGENTS.md`를 따릅니다.
