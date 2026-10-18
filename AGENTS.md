# AGENTS.md

이 파일은 `portfolio2` 저장소에서 작업하는 AI 에이전트를 위한 지침의 **원본**입니다. 어떤 에이전트든 작업을 시작하기 전에 이 파일 전체를 읽고, 아래 [필수 규칙](#필수-규칙)의 스킬을 따릅니다.

## 프로젝트 개요

- Next.js 15 (Pages Router) + React 18 + TypeScript 5 포트폴리오 사이트
- 스타일: Tailwind CSS 3 (`dark` class), 상태: Zustand / SWR
- 패키지 매니저: **pnpm** (npm/yarn 사용 금지)
- 아키텍처: Feature-Sliced Design. 레이어 의존은 `pages → widgets → features → entities → shared` 단방향
- 배포: Vercel. `master` 푸시 시 `.github/workflows/release-tag.yml`이 태그/릴리스를 만든다
- CI: `master`/`dev` 대상 PR마다 `.github/workflows/ci.yml`이 `lint`, `format:check`, `type-check`, `test:ci`를 실행한다. 의존성 설치에는 `NPM_TOKEN` secret(`read:packages`)이 필요하다. 워크플로는 이 값을 `.npmrc`가 읽는 `GITHUB_NPM_TOKEN` 환경 변수로 넘긴다. `master` ruleset은 체크 `Lint, Typecheck, Test`와 `review-gate`가 성공해야 머지를 허용한다. CI가 실패하거나 최신 리뷰에 🔴가 있으면 머지하지 않는다
- AI 리뷰: `.github/workflows/ai-review.yml`은 PR 댓글 `/review`로만 실행한다. PR 생성·푸시 자동 실행은 꺼 두었다 (`CURSOR_API_KEY` secret 필요, 체크는 실패시키지 않음)
- 응답 언어: 사용자에게는 **한국어**로 답변한다. 근거를 남기는 문장(리뷰의 이유·제안·테스트 근거, QA 발견, 테스트를 생략하거나 예외로 둔 이유, 머지를 막는 이유)과 이슈 제목·본문은 `~습니다` 또는 `~ㅂ니다`로 끝낸다. `~다`로 끝내지 않고, 한 글에서 어미를 섞지 않는다. 이슈 본문 형식은 `issue` 스킬을 따른다. 코드, 식별자, 커밋 제목처럼 문장이 아닌 표기는 제외한다

## 디렉토리 구조

```
src/
├── pages/          # Next.js 라우트. 레이아웃과 데이터 전달만
├── widgets/        # features 조합 UI
├── features/       # 기능 슬라이스 (ui/, model/, api/, index.ts)
├── entities/       # 현재 거의 미사용
├── shared/         # api, config, helpers, hooks, lib, styles, types, ui
└── contents/       # MDX 정적 콘텐츠
.agents/skills/     # 공통 에이전트 스킬 (원본)
.cursor/skills/     # Cursor용 심볼릭 링크 → .agents/skills/*
.claude/skills/     # Claude Code용 심볼릭 링크 → .agents/skills/*
```

현재 feature 슬라이스: `about`, `blog`, `chat`, `cmdpallete`, `contact`, `dashboard`, `guestbook`, `home`, `learn`, `playground`, `projects`.

## 주요 명령어

| 목적        | 명령어                                                |
| ----------- | ----------------------------------------------------- |
| 개발 서버   | 사용자가 직접 실행 (`pnpm dev` 또는 `pnpm dev:https`) |
| 빌드        | `pnpm build`                                          |
| 린트        | `pnpm lint`                                           |
| 포맷        | `pnpm format`                                         |
| 포맷 검사   | `pnpm format:check`                                   |
| 타입 검사   | `pnpm type-check`                                     |
| 단위 테스트 | `pnpm test` / `pnpm test -- <경로>`                   |
| 통합 테스트 | `pnpm test:integration`                               |
| 테스트 감시 | `pnpm test:watch`                                     |

개발 서버는 에이전트가 자동으로 띄우지 않습니다.

## 코딩 컨벤션

- 함수형 컴포넌트와 유틸은 화살표 함수를 우선한다. 공개 props와 함수 인자는 명시적 타입을 둔다
- 경로 별칭: `@/*` → `src/*`, `@docs/*` → `docs/*`. import 순서: 외부 → `@/` → 상대경로
- 슬라이스 밖에서는 내부 파일을 직접 import하지 않고 `index.ts`를 거친다. 같은 레이어끼리의 cross-import는 하지 않는다 (`shared` 제외)
- `pages`에 비즈니스 로직을 두지 않는다. `shared`에 특정 feature 전용 코드를 두지 않는다
- 새 파일은 FSD 레이어에 만든다. `src/common`, `src/modules`, `src/services`를 다시 만들지 않는다
- 조건부 class는 `@/shared/lib/cn`을 쓴다. Tailwind 클래스 순서는 Prettier에 맡기고 수동으로 재정렬하지 않는다
- 다크 모드는 `dark:` 접두사를 유지한다
- 컴포넌트 파일은 PascalCase, 훅은 `useXxx.ts`
- 가드 절과 early return을 쓰고, 빈 `catch`를 두지 않는다. 주석은 이유를 설명할 때만 단다
- 의미 있는 `alt`, 키보드 조작, `NextSeo`를 고려한다
- 요청 범위 밖 리포맷과 리팩터링은 하지 않는다

## 안전 규칙

- `.env`, `.env.local`, `cert/`, `.vercel/` 내용을 커밋하거나 출력하지 않는다
- `NEXT_PUBLIC_` 값은 브라우저에 노출된다. 토큰·시크릿을 이 접두사로 새로 넣지 않는다
- `master` 브랜치에 직접 커밋/푸시하지 않는다
- `master`를 기준으로 브랜치를 만들거나 병합·비교·PR 베이스로 쓸 때는 먼저 `git fetch origin`으로 `origin/master` 최신을 받은 뒤 그 커밋을 쓴다
- `git push --force`, `git reset --hard` 등 파괴적 작업은 사용자 확인 후에만 수행한다
- 사용자가 요청하지 않은 커밋/푸시/PR 생성은 하지 않는다

## 토큰 사용

한도는 토큰 개수가 아니라 단가 × 토큰이다. Always 규칙과 읽은 파일이 매 턴 비용이다.

- Fast는 기본으로 켜지 않는다. 사용자가 속도를 요청할 때만 켠다
- 긴 컨텍스트(256k/500k)는 기본으로 쓰지 않는다
- 필요한 파일만 읽고, 락파일·`node_modules`·로그 전체를 붙이지 않는다
- 테스트는 바꾼 경로부터 실행하고, 전체 스위트는 커밋·CI 직전에 실행한다
- 개발 서버·브라우저·서브에이전트는 요청되거나 화면 검증이 필요할 때만 쓴다
- 스킬은 해당 작업의 `SKILL.md`만 읽고, 전부를 미리 읽지 않는다
- 단가표와 대시보드 조회는 `usage` 스킬에만 둔다. 이 파일에 가격표를 복사하지 않는다
- 작업이 끝나면 목표 대비 토큰 사용을 짧게 보고한다. Fast 여부, 읽은 범위, 실행한 테스트 범위, 브라우저·서브에이전트 사용 여부를 적는다. 대시보드 숫자는 `usage` 스킬을 실행했을 때만 적고 추정하지 않는다

## 에이전트 스킬

모든 에이전트(Cursor, Claude Code, Codex 등)가 공통으로 사용하는 스킬은 `.agents/skills/<skill-name>/SKILL.md`에 있습니다. `.cursor/skills/`와 `.claude/skills/`의 항목은 같은 디렉터리를 가리키는 심볼릭 링크입니다.

### 필수 규칙

아래 작업을 할 때는 **반드시** 해당 `SKILL.md`를 먼저 읽고 그 절차를 그대로 따릅니다. 사용자가 스킬 이름을 언급하지 않아도 적용하며, 생략하거나 임의의 방식으로 대체하지 않습니다.

1. **코드 수정 → `tdd` 스킬 필수**
   - `src/`의 코드(기능 추가, 버그 수정, 리팩터링)를 수정할 때는 항상 `tdd` 스킬로 진행한다
   - 실패하는 테스트를 먼저 작성하고 실패를 확인한 뒤에 구현 코드를 수정한다
   - 코드를 수정하면 관련 파일의 테스트 코드도 반드시 추가하거나 수정한다
   - 문서(`*.md`), MDX 본문, 설정만 바꾸는 경우는 예외지만, 그 판단 근거를 `~습니다`로 사용자에게 알린다
2. **커밋 → `commit` 스킬 필수**
   - 모든 커밋은 `commit` 스킬의 절차로만 수행한다
   - 코드 변경 커밋은 직전에 `review` 스킬(staged)을 실행하고, 🔴 항목이 있으면 커밋하지 않고 보고한다
3. **PR 생성 → `pr` 스킬 필수**
   - 모든 PR은 `pr` 스킬의 절차와 `.github/pull_request_template.md` 형식으로만 생성한다
   - PR 담당자(assignee)는 반드시 현재 `gh`에 로그인된 활성 GitHub 계정으로 지정한다
   - PR 생성 후 `review` 스킬(branch) 결과를 PR 댓글로 남긴다. CI가 실패했거나 최신 리뷰에 🔴가 있으면 머지하지 않는다. 사용자가 알고 있어도 예외로 머지하지 않는다
4. **코드 리뷰 기준 → `review` 스킬**
   - 로컬 리뷰와 CI `/review`(`.github/workflows/ai-review.yml`)는 모두 `review` 스킬의 관점·심각도를 따르고, 댓글 본문은 `.agents/skills/review/TEMPLATE.md`만 채운다. 발견마다 TDD 근거가 있어야 한다. 리뷰 기준은 이 스킬에서만 수정한다
5. **이슈 생성 → `issue` 스킬 필수**
   - 모든 이슈는 `issue` 스킬과 `.github/ISSUE_TEMPLATE.md`로만 만든다. 상태는 저장소 GitHub Project의 Status이고 값은 `ToDo`, `In Progress`, `Review`, `Done`만 쓴다. 새 이슈는 `ToDo`다. 라벨로 상태를 만들지 않는다
   - 예상, 변경범위, 코드, 1급 시민, 불변조건, TDD 기준 테스트 조건은 목록이다. 테스트 조건을 빼거나 뒤로 미루지 않는다
   - 제목과 본문 문장은 `~습니다` 또는 `~ㅂ니다`로 끝낸다. `~다`로 끝내지 않는다

### 스킬 목록

| 스킬     | 경로                             | 사용 시점                                                                      |
| -------- | -------------------------------- | ------------------------------------------------------------------------------ |
| `tdd`    | `.agents/skills/tdd/SKILL.md`    | **코드를 수정할 때 항상**                                                      |
| `commit` | `.agents/skills/commit/SKILL.md` | **커밋할 때 항상**                                                             |
| `pr`     | `.agents/skills/pr/SKILL.md`     | **PR을 생성할 때 항상**                                                        |
| `qa`     | `.agents/skills/qa/SKILL.md`     | 작업 완료 전 검증, 커밋/PR 직전, "QA 해줘" 요청 시                             |
| `review` | `.agents/skills/review/SKILL.md` | **커밋 직전(staged), PR 생성 직후(branch), CI `/review`**, "리뷰 해줘" 요청 시 |
| `usage`  | `.agents/skills/usage/SKILL.md`  | "사용량", "남은 한도" 확인 요청 시                                             |
| `issue`  | `.agents/skills/issue/SKILL.md`  | **이슈를 만들 때 항상**. 본문은 `.github/ISSUE_TEMPLATE.md`                    |

일반적인 작업 흐름: `tdd` → `qa` → `commit`(→ `review` staged) → `pr`(→ `review` branch 댓글) → CI(`ci`) → `Lint, Typecheck, Test`와 `review-gate`가 모두 성공한 뒤에만 머지. CI 리뷰는 PR 댓글 `/review`로만 실행한다. CI 실패나 🔴가 남아 있으면 머지하지 않는다.

새 스킬 추가 방법:

```bash
mkdir -p .agents/skills/<kebab-case-name>   # SKILL.md 작성
ln -s ../../.agents/skills/<kebab-case-name> .cursor/skills/<kebab-case-name>
ln -s ../../.agents/skills/<kebab-case-name> .claude/skills/<kebab-case-name>
```

그다음 위 표에 등록합니다. 스킬 수정은 항상 `.agents/skills/` 원본에서 합니다.

## 에이전트별 진입점

에이전트마다 자동으로 읽는 파일이 달라서, 각 도구가 이 파일(`AGENTS.md`)로 오도록 진입점 파일을 둡니다. 진입점 파일에는 내용을 늘리지 않고, 지침은 항상 이 파일에서 수정합니다.

| 에이전트       | 자동으로 읽는 파일                                  | 스킬 위치         |
| -------------- | --------------------------------------------------- | ----------------- |
| Cursor         | `AGENTS.md`, `.cursor/rules/agents.mdc` (항상 적용) | `.cursor/skills/` |
| Codex          | `AGENTS.md`                                         | `.agents/skills/` |
| Claude Code    | `CLAUDE.md` (`@AGENTS.md` 포함)                     | `.claude/skills/` |
| Gemini CLI     | `GEMINI.md` (`@AGENTS.md` 포함)                     | `.agents/skills/` |
| GitHub Copilot | `.github/copilot-instructions.md`                   | `.agents/skills/` |

- 필수 규칙(스킬 목록, 필수 사용 시점)을 바꾸면 요약이 들어 있는 `.cursor/rules/agents.mdc`와 `.github/copilot-instructions.md`도 함께 갱신한다
- 새 에이전트를 지원하려면 그 도구가 읽는 파일을 만들어 이 파일을 가리키게 하고 위 표에 추가한다
