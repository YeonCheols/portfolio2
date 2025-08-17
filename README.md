# 연철's 포트폴리오

## 목차

- [프로젝트 개요](#프로젝트-개요)
- [주요 기술 스택](#주요-기술-스택)
  - [Frontend](#frontend)
  - [Backend & Database](#backend--database)
  - [개발 Tools](#개발-tools)
- [프로젝트 구조](#프로젝트-구조)
- [주요 기능](#주요-기능)
- [개발 환경 설정](#개발-환경-설정)
- [배포](#배포)
- [프로젝트 실행 방법](#프로젝트-실행-방법)
- [지원도구](#지원도구)
- [sitemap 파일 생성](#sitemap-파일-생성)
- [Git Commit Message Convention](#git-commit-message-convention)
- [라이선스](#라이선스)

---

## 프로젝트 개요

- 프로젝트명: 포트폴리오 웹 사이트
- 기술 스택: React, Next.js, TypeScript, TailwindCSS, Husky

## 주요 기술 스택

### Frontend

- Next.js 14.2.25
- React 18.2.0
- TypeScript 5.0.4
- TailwindCSS 3.3.2
- Framer Motion 10.18.0
- React Icons 4.12.0

### Backend & Database

- nestjs (별도 프로젝트) 
- supabase database

### 개발 Tools

- ESLint
- Prettier
- Jest
- Husky
- CommitLint

![Visual Studio Code](https://img.shields.io/badge/Visual_Studio_Code-0078d7?style=for-the-badge&logo=visual-studio-code&logoColor=white)
![JavaScript](https://img.shields.io/badge/javascript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=white)
![TypeScript](https://img.shields.io/badge/typescript-3178C6?style=for-the-badge&logo=Typescript&logoColor=white)
![React](https://img.shields.io/badge/react-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![NextJs](https://img.shields.io/badge/next.js-000000?style=for-the-badge&logo=Next.js&logoColor=white)
![TailWindCss](https://img.shields.io/badge/TAILWINDCSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![Prisma](https://img.shields.io/badge/PRISMA-2D3748?style=for-the-badge&logo=prisma&logoColor=white)
![GithubAction](https://img.shields.io/badge/GITHUBACTION-2088FF?style=for-the-badge&logo=githubactions&logoColor=white)

## 프로젝트 구조

```
src/
├── common/        # 공통 컴포넌트 및 유틸리티
├── contents/      # 컨텐츠 관련 파일
├── modules/       # 기능 모듈
├── pages/         # Next.js 페이지
├── services/      # 서비스 로직
└── __tests__/     # 테스트 코드
```

## 주요 기능

1. **인증 시스템**

   - NextAuth.js를 활용한 사용자 인증
   - 소셜 로그인 지원

2. **UI/UX**

   - 반응형 디자인
   - 다크 모드 지원
   - 애니메이션 효과 (Framer Motion)
   - 무한 스크롤
   - 코드 하이라이팅

3. **컨텐츠 관리**

   - MDX 지원
   - 마크다운 렌더링
   - 코드 에디터 (Monaco Editor)

4. **AI 챗봇 시스템**

   - Gemini API 기반 기술 멘토 챗봇
   - 사용자 수준별 맞춤형 답변
   - 기술 스택별 특화 프롬프트
   - 질문 유형 자동 감지 및 특화 답변
   - 대화 컨텍스트 유지

5. **성능 최적화**
   - SEO 최적화 (next-seo)
   - 사이트맵 자동 생성
   - 이미지 최적화

## 개발 환경 설정

- Node.js 기반 개발 환경
- TypeScript 설정
- ESLint와 Prettier를 통한 코드 스타일 관리
- Husky를 통한 Git Hook 관리
- Jest를 통한 테스트 환경 구성

## 배포

- Vercel 플랫폼을 통한 배포
- CI/CD 파이프라인 구성

## 프로젝트 실행 방법

```bash
# 개발 서버 실행
pnpm dev

# 프로덕션 빌드
pnpm build

# 테스트 실행
pnpm test

# 린트 체크
pnpm lint

```

## 지원도구

### 1. 테스트 코드

```bash
pnpm test
```

### 2. 타입 체크

```bash
pnpm typecheck
```

### 3. lint 체크

```bash
# lint 체크
pnpm lint

# lint 수정
pnpm lint:fix
```

### 4. 데이터베이스 콘솔

```bash
# 스튜디오
pnpm prisma:studio

# 스키마 수정
pnpm prisma:push

```

### 5. APi schema 가져오기

```bash
# api 받아오기
pnpm fetch-schema
```

## sitemap 파일 생성

- sitemap config 설정은 next seo 설정을 따름
- 설정은 [여기](https://github.com/YeonCheols/portfolio2/blob/master/next-sitemap.config.js)를 통해서 수정

```bash
pnpm postbuild
```

## Git Commit Message Convention

이 프로젝트는 [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) 사양을 따릅니다.

자세한 커밋 메시지 가이드는 [커밋 컨벤션 문서](./docs/COMMIT_CONVENTION.md)를 참조하세요.

### 주요 커밋 타입

- **feat**: 새로운 기능 추가
- **fix**: 버그 수정
- **docs**: 문서 수정
- **style**: 코드 포맷팅, 세미콜론 등 (기능 변화 없음)
- **refactor**: 코드 리팩토링 (기능 변화 없음)
- **perf**: 성능 개선
- **test**: 테스트 코드 추가/수정
- **build**: 빌드 시스템 변경
- **ci**: CI 설정 변경
- **chore**: 빌드, 도구 설정, 기타
- **revert**: 이전 커밋 되돌리기

### 커밋 메시지 검증

이 프로젝트는 자동으로 커밋 메시지를 검증합니다:

```bash
# 커밋 메시지 형식 도움말
npm run commit:help

# 커밋 메시지 검증 (수동)
npm run commit:check
```

#### 시스템 알림 기능

macOS 환경에서 커밋 메시지가 올바르지 않을 때 직관적인 경고 알림이 표시됩니다:

- **⚠️ 경고 아이콘**: 시각적으로 명확한 경고 표시
- **터미널 출력**: 기존과 동일한 상세한 오류 메시지
- **시스템 알림**: macOS 알림 센터를 통한 즉시 피드백
- **경고음**: "Basso" 사운드로 경고 상황 강조
- **구체적인 해결 방법**: 문제점과 함께 해결 방법 제시

**알림 예시:**

- "🚨 커밋 실패: 커밋 메시지 형식이 올바르지 않습니다. Conventional Commits 형식을 확인하세요."
- "🚨 커밋 실패: 커밋 제목이 50자를 초과했습니다. 현재: 65자 (제한: 50자)"
- "🚨 커밋 실패: 커밋 제목은 소문자로 시작해야 합니다. 첫 글자를 소문자로 변경해주세요."

> **참고**: 시스템 알림은 macOS 환경에서만 작동하며, 터미널 환경에서는 자동으로 비활성화됩니다.

### 센트리 설정

- 작업중

### 라이선스

- MIT License
