---
description: 변경된 코드를 리뷰합니다. FSD 위반, lint 오류, 타입 오류, 코드 품질을 종합 검사합니다.
---

# Review — 코드 리뷰

staged/unstaged 변경사항 또는 지정 파일을 대상으로 종합 코드 리뷰를 수행합니다.

## 실행 절차

### 1. 리뷰 대상 결정

`` 에 파일 경로가 있으면 해당 파일만 리뷰.
없으면 `git diff HEAD`의 변경 파일 전체 리뷰.

### 2. 검사 항목 (병렬 실행)

아래 4가지를 동시에 검사합니다.

#### A. FSD 위반 검사

- 상위 레이어가 하위 레이어를 import하는지 확인
  - `shared`가 `features/widgets/pages`를 import → 위반
  - `features`가 `widgets/pages`를 import → 위반
  - `features` 슬라이스 간 cross-import → 위반
- 슬라이스 내부 직접 접근 확인
  - 외부에서 `@/features/blog/ui/BlogCard` → 위반 (index.ts 통해야 함)
- `index.ts` Public API 준수 여부

#### B. ESLint 검사

```bash
pnpm exec eslint <파일들> --format=compact
```

`import/order`, `boundaries` 위반 여부 확인.

#### C. TypeScript 검사

```bash
pnpm exec tsc --noEmit
```

변경 파일 관련 타입 오류 확인.

#### D. 코드 품질 검사 (정적 분석)

아래 항목을 코드를 읽으며 확인합니다:
- **중복 코드** — shared/ui로 추출 가능한 패턴
- **과도한 props drilling** — Context 또는 상태 관리 필요 여부
- **`any` 타입 사용** — 구체적 타입으로 교체 가능 여부
- **미사용 import/변수**
- **하드코딩 값** — config/shared로 분리 가능 여부

### 3. 리뷰 결과 보고

아래 형식으로 결과를 출력합니다:

```
## 코드 리뷰 결과

### ✅ 통과
- TypeScript 오류 없음
- FSD 레이어 위반 없음

### ⚠️ 경고 (수정 권장)
- src/features/blog/ui/BlogCard.tsx:15 — any 타입 사용

### ❌ 오류 (수정 필요)
- src/widgets/home/ui/Home.tsx:3 — features 슬라이스 간 cross-import 위반

### 💡 제안
- BlogCard의 date 포맷 로직은 @/shared/helpers로 분리를 고려
```

### 4. 수정 제안

사용자가 원하면 오류/경고 항목을 수정합니다. 항목별로 확인을 받습니다.

---

## 우선순위

1. **❌ 오류** — FSD 위반, TypeScript 오류, ESLint 오류 → 반드시 수정
2. **⚠️ 경고** — any 타입, 코드 품질 → 수정 권장
3. **💡 제안** — 리팩토링 아이디어 → 선택 사항
