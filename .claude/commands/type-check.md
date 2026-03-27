---
description: TypeScript 타입 오류를 검사하고 수정합니다. tsc --noEmit 실행 후 오류를 분석합니다.
---

# Type Check — TypeScript 오류 검증 및 수정

`tsc --noEmit`으로 전체 타입 오류를 검사하고, 오류가 있으면 수정합니다.

## 실행 절차

### 1. 타입 검사 실행

```bash
pnpm exec tsc --noEmit 2>&1
```

오류가 없으면 "✅ 타입 오류 없음"을 출력하고 종료.

### 2. 오류 분류

오류를 아래 카테고리로 분류합니다:

| 카테고리 | 예시 | 자동 수정 가능 |
|---------|------|--------------|
| **타입 불일치** | `string`에 `number` 할당 | 수동 확인 필요 |
| **누락된 프로퍼티** | `Property X does not exist` | 타입 정의 추가 |
| **`undefined` 미처리** | `Object is possibly undefined` | Optional chaining 추가 |
| **모듈 못 찾음** | `Cannot find module` | import 경로 수정 |
| **암묵적 any** | `Parameter X implicitly has any type` | 타입 명시 |

### 3. 오류 보고

아래 형식으로 사용자에게 보고합니다:

```
## TypeScript 오류 분석

### 자동 수정 가능 (X개)
- src/features/blog/ui/BlogCard.tsx:12 — undefined 미처리 → optional chaining 적용
- ...

### 수동 확인 필요 (X개)
- src/shared/types/blog.ts:5 — 타입 정의 변경 필요
- ...
```

### 4. 자동 수정 (확인 후)

사용자 승인 후:
- `?.` optional chaining 추가
- 누락된 타입 annotation 추가
- import 경로 수정

수정 후 다시 `tsc --noEmit` 실행하여 오류 해소 확인.

### 5. 수동 확인 항목

자동 수정 불가한 항목은 파일, 라인, 오류 내용을 목록으로 제공합니다.

---

## 주의사항

- 타입 캐스팅(`as any`, `as unknown`)으로 오류를 숨기지 않습니다
- 근본 원인을 수정합니다 — 타입 assertion은 최후 수단
- `// @ts-ignore`는 사용하지 않습니다
- 오류 수정 중 기존 로직이 변경되지 않도록 주의합니다
