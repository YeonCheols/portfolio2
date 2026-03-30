# Portfolio2 — Claude 지침

Next.js 기반 포트폴리오 사이트입니다. **FSD(Feature-Sliced Design)** 아키텍처로 구조 개편이 완료된 상태입니다.

## 기술 스택

- **Framework**: Next.js 15 (Pages Router), React 18, TypeScript 5
- **Styling**: Tailwind CSS v3
- **State**: Zustand, SWR
- **Services**: Firebase, Google OAuth, Sentry
- **Package Manager**: pnpm
- **Lint/Format**: ESLint (`@feature-sliced/eslint-config`), Prettier
- **Commit**: Conventional Commits, commitlint, husky

## FSD 레이어 구조

```
src/
  pages/      # Next.js 라우트 (thin layer — 레이아웃 + 데이터 패싱만)
  widgets/    # 복합 UI 블록 (features + entities 조합)
  features/   # 기능 단위 슬라이스 (11개)
  entities/   # 비즈니스 엔티티 (현재 미사용)
  shared/     # 범용 유틸, UI 킷, 타입
    api/      # API 클라이언트
    config/   # 앱 설정
    helpers/  # 유틸 함수
    hooks/    # 공통 훅
    lib/      # 라이브러리 헬퍼 (cn, mdx, sentry)
    styles/   # 전역 스타일
    types/    # 공유 타입
    ui/       # 디자인 시스템 컴포넌트
  contents/   # MDX 정적 콘텐츠
```

### 현재 features 슬라이스 (11개)

`about`, `blog`, `chat`, `cmdpallete`, `contact`, `dashboard`, `guestbook`, `home`, `learn`, `playground`, `projects`

각 슬라이스 내부 구조: `ui/`, `model/`, `api/`, `index.ts`

## 핵심 규칙

- **레이어 의존 방향**: `pages → widgets → features → entities → shared` (단방향)
- **같은 레이어 간 cross-import 금지** (shared 제외)
- **외부에서 슬라이스 내부 직접 import 금지** — 반드시 `index.ts` 경유
- **pages 파일에 비즈니스 로직 작성 금지**
- **shared에 특정 feature 종속 코드 금지**
- 새 파일은 반드시 FSD 레이어에 생성 (`common/`, `modules/`, `services/` 재생성 금지)

## 커밋 컨벤션

- **언어**: 한국어
- **형식**: `<type>(<scope>): <description>`
- **제목 전체 100자 이하** (pre-commit hook 강제)
- **description 소문자 시작** (FSD → fsd, API → api)
- **마침표 금지**, 명령형·현재 시제

## 활성 스킬 (`/` 커맨드)

| 커맨드 | 설명 |
|--------|------|
| `/commit` | git diff 분석 후 Conventional Commits 메시지 자동 생성 및 커밋 |
| `/review` | FSD 위반 · lint · 타입 오류 · 코드 품질 종합 검사 |
| `/type-check` | TypeScript 타입 오류 검사 및 수정 |
| `/new-feature <name>` | FSD feature 슬라이스 스캐폴딩 (ui/model/api + index.ts) |
| `/new-page <path>` | Next.js 페이지 + 대응 feature 슬라이스 함께 생성 |
| `/fsd-restructure` | FSD 구조 개편 지침 적용 |
| `/fsd-cleanup` | 미사용 파일·export·슬라이스 탐지 및 정리 |
| `/perf-check [파일]` | 불필요한 리렌더·번들 크기·이미지·코드 스플리팅 최적화 검사 및 수정 |
| `/memory-leak [파일]` | useEffect 클린업 누락·이벤트 리스너·타이머·구독 메모리 누수 탐지 및 수정 |
| `/pr [base]` | 현재 브랜치에서 GitHub PR 자동 생성 |
