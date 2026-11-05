# MCP 명명 규칙

이 문서는 `mcp/` workspace의 직접 관리하는 코드에 적용합니다. 상위 포트폴리오 웹 앱의 명명 규칙은 변경하지 않습니다. 프레임워크별 관례가 다르므로 업계의 단일 표준이 아니라 이 프로젝트에서 합의한 규칙으로 사용합니다.

## 파일과 폴더

- 파일과 폴더는 소문자 kebab-case를 사용합니다. `create-resume-pdf.ts`, `admin-menu.ts`, `resume-archive/`처럼 단어를 하이픈으로 구분합니다.
- 파일명은 주요 역할이나 식별자와 대응합니다. `createResumePdf`는 `create-resume-pdf.ts`, `ArchiveDetailPage`는 `archive-detail-page.tsx`에 둡니다.
- 테스트는 구현 옆에서 같은 이름과 `.test.ts` 또는 `.test.tsx`를 사용합니다. 시나리오를 구분할 때는 `resume-tools.generation.test.ts`처럼 접미사를 추가합니다.
- `.config`, `.test`, `.d.ts` 같은 도구·파일 역할 접미사는 점으로 구분합니다. `vite.config.ts`, `index.ts`, `package.json` 같은 기존 진입점·설정 관례를 유지합니다.
- 이번 작업은 표기 통일이며 기존 파일의 의미를 축약하거나 역할을 분리하지 않습니다.

## 코드 식별자

- 타입 별칭·인터페이스·클래스·React 컴포넌트는 PascalCase를 사용합니다. `ResumeModel`, `ArchiveDetailProps`, `ResumeConnectionError`, `ArchiveDetailPage`처럼 작성합니다.
- 일반 함수·변수·프로퍼티는 camelCase를 사용합니다. `createResumePdf`, `generationId`, `pageRegistry`처럼 작성합니다. 훅은 `useArchive`처럼 `use`로 시작합니다.
- 기존 전역 상수 `MODEL_PROVIDERS`와 같은 UPPER_SNAKE_CASE 상수는 유지합니다. 외부 라이브러리의 생성자·타입 이름도 유지합니다.
- MCP 도구 이름, 환경변수, 오류 코드, HTTP·OAuth 경로, JSON 필드, Storage 객체 키 같은 외부 계약은 코드 명명 규칙으로 변경하지 않습니다.

## 예외와 검사

- `Dockerfile`, `AGENTS.md`, `README.md`, `CLAUDE.md`, `GEMINI.md`와 에이전트·도구 지정 파일명은 유지합니다. 다만 자체 테스트 파일은 `dockerfile.test.ts`처럼 소문자로 작성합니다.
- `.env*` 같은 설정·민감 파일, 의존성, 생성 산출물, 외부 폰트 자산은 일괄 이름 변경 대상에서 제외합니다.
- `directory-boundary.test.ts`가 앱·공통 패키지·스크립트와 MCP 루트의 직접 관리하는 코드 파일명을 검사합니다. 빌드·테스트로 import와 패키지 공개 진입점의 연결을 검증합니다.

## 참고한 가이드

- [Angular 스타일 가이드](https://angular.dev/style-guide#separate-words-in-file-names-with-hyphens)는 파일명 하이픈과 기존 코드 내 일관성을 권장합니다. Angular 전용 `.spec.ts`까지 도입하지 않고 기존 테스트 실행기의 `.test.ts`를 유지합니다.
- [TypeScript 프로젝트 기여 가이드](https://github.com/microsoft/TypeScript/wiki/Coding-guidelines)는 타입 PascalCase와 함수·변수 camelCase를 사용합니다. 이 문서는 TypeScript 커뮤니티 전체에 강제하는 규칙이 아니라고 명시합니다.
- [React 컴포넌트 가이드](https://react.dev/learn/your-first-component)는 컴포넌트 이름이 대문자로 시작해야 한다고 설명합니다. 컴포넌트 파일명을 PascalCase로 요구하지는 않습니다.
- [AWS TypeScript 가이드](https://docs.aws.amazon.com/prescriptive-guidance/latest/best-practices-cdk-typescript-iac/typescript-best-practices.html)는 타입 PascalCase, 함수·변수 camelCase, 전역 상수 UPPER_CASE를 권장합니다. 파일명은 camelCase를 권장하므로 파일명 관례가 생태계마다 다름을 구분합니다.
