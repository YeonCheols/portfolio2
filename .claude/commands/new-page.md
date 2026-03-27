---
description: Next.js 페이지와 대응하는 FSD feature 슬라이스를 함께 생성합니다.
---

# New Page — 페이지 + Feature 스캐폴딩

Next.js 페이지(`src/pages/`)는 thin layer로 유지하고, 실제 UI는 `src/features/`에 생성합니다.

## 실행 절차

### 1. 입력 수집

`` 에 페이지 이름이 있으면 사용, 없으면 사용자에게 질문:
- **페이지 경로** (예: `about`, `projects/[slug]`, `blog/index`)
- **데이터 페칭 방식**:
  - `SSG` — getStaticProps (빌드 시 생성, 기본값)
  - `SSR` — getServerSideProps (요청마다 생성)
  - `CSR` — 클라이언트에서 SWR/fetch

### 2. 기존 파일 확인

`src/pages/<path>.tsx`가 이미 존재하면 사용자에게 알리고 중단.

### 3. 파일 생성

#### 페이지 파일 — `src/pages/<path>.tsx`

**SSG 예시**:
```tsx
import type { GetStaticProps, NextPage } from "next";
import { NextSeo } from "next-seo";

import <FeatureName> from "@/features/<feature-name>";
import Container from "@/shared/ui/Container";

interface Props {
  // TODO: props 타입
}

const <PageName>Page: NextPage<Props> = (props) => {
  return (
    <>
      <NextSeo title="<페이지 제목>" />
      <Container>
        <<FeatureName> {...props} />
      </Container>
    </>
  );
};

export const getStaticProps: GetStaticProps = async () => {
  return {
    props: {},
  };
};

export default <PageName>Page;
```

**CSR 예시** (데이터 페칭 없음):
```tsx
import type { NextPage } from "next";
import { NextSeo } from "next-seo";

import <FeatureName> from "@/features/<feature-name>";
import Container from "@/shared/ui/Container";

const <PageName>Page: NextPage = () => {
  return (
    <>
      <NextSeo title="<페이지 제목>" />
      <Container>
        <<FeatureName> />
      </Container>
    </>
  );
};

export default <PageName>Page;
```

#### Feature 슬라이스 — `/new-feature` 스킬 호출

동일한 이름으로 `/new-feature`를 실행하여 feature 슬라이스를 생성합니다.

### 4. 결과 출력

생성된 파일 목록과 다음 안내:
- 라우트 경로 (`/<path>`)
- feature에서 props 타입 정의 방법
- 필요 시 동적 라우트(`getStaticPaths`) 추가 방법

---

## 컨벤션

- 페이지 파일은 레이아웃 + 데이터 패싱만 담당 — 비즈니스 로직은 feature로
- `NextSeo` 로 메타데이터 관리 (이 프로젝트 컨벤션)
- `Container` 컴포넌트로 최대 너비 제한
- 동적 라우트는 `[slug].tsx` 패턴 사용
