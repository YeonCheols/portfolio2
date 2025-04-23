# 연철's 포트폴리오 프로젝트

## 프로젝트 개요

- 프로젝트명: 포트폴리오 웹 사이트
- 버전: 0.1.0
- 기술 스택: Next.js, TypeScript, TailwindCSS, Prisma

## 주요 기술 스택

### Frontend

- Next.js 14.2.25
- React 18.2.0
- TypeScript 5.0.4
- TailwindCSS 3.3.2
- Framer Motion 10.18.0
- React Icons 4.12.0

### Backend & Database

- Prisma 6.5.0
- NextAuth.js 4.24.11

### Development Tools

- ESLint
- Prettier
- Jest
- Husky
- CommitLint

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

4. **성능 최적화**
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

## 라이선스

- MIT License
