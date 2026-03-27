---
description: FSD feature 슬라이스를 스캐폴딩합니다. ui/model/api 구조와 index.ts를 자동 생성합니다.
---

# New Feature — FSD 슬라이스 스캐폴딩

`src/features/<name>/` 디렉터리를 FSD 규칙에 맞게 생성합니다.

## 실행 절차

### 1. 입력 수집

`` 에 feature 이름이 있으면 사용, 없으면 사용자에게 질문:
- **feature 이름** (kebab-case, 예: `blog`, `user-profile`)
- **필요한 세그먼트** — 아래 중 해당하는 것 선택 (기본: ui만)
  - `ui` — UI 컴포넌트 (항상 포함)
  - `model` — 상태 관리 (Zustand store 또는 React Context)
  - `api` — API 호출 함수

### 2. 기존 슬라이스 확인

`src/features/<name>/` 이 이미 존재하면 사용자에게 알리고 중단.

### 3. 파일 생성

선택된 세그먼트에 따라 파일을 생성합니다.

#### 항상 생성

**`src/features/<name>/index.ts`**
```ts
// Public API — 외부에서는 반드시 이 파일을 통해서만 접근
export { default } from "./ui/<ComponentName>";
```

**`src/features/<name>/ui/<ComponentName>.tsx`**
```tsx
const <ComponentName> = () => {
  return <div></div>;
};

export default <ComponentName>;
```

#### `model` 선택 시

사용자에게 확인: **Zustand store** vs **React Context** 중 선택

**Zustand (store)**: `src/features/<name>/model/use<Name>Store.ts`
```ts
import { create } from "zustand";

interface <Name>State {
  // TODO: 상태 정의
}

const use<Name>Store = create<<Name>State>()((set) => ({
  // TODO: 초기값 및 액션 정의
}));

export default use<Name>Store;
```

**React Context**: `src/features/<name>/model/<Name>Context.tsx`
```tsx
import { createContext, useContext, useState } from "react";

interface <Name>ContextType {
  // TODO: 컨텍스트 타입 정의
}

const <Name>Context = createContext<<Name>ContextType | null>(null);

export const <Name>Provider = ({ children }: { children: React.ReactNode }) => {
  return (
    <<Name>Context.Provider value={{}}>
      {children}
    </<Name>Context.Provider>
  );
};

export const use<Name>Context = () => {
  const context = useContext(<Name>Context);
  if (!context) throw new Error("use<Name>Context must be used within <Name>Provider");
  return context;
};
```

#### `api` 선택 시

**`src/features/<name>/api/<name>.ts`**
```ts
import fetcher from "@/shared/api/fetcher";

// TODO: API 함수 정의
export const get<Name> = async () => {
  return fetcher("/api/<name>");
};
```

### 4. 결과 출력

생성된 파일 목록을 출력하고, 다음 단계를 안내합니다:
- `index.ts`에 추가 export 필요 여부
- 페이지에서 import하는 방법 (`import <Name> from "@/features/<name>"`)
- 타입 정의가 필요한 경우 `src/shared/types/<name>.ts` 생성 안내

---

## 주의사항

- feature 이름은 항상 **kebab-case** 사용
- 컴포넌트 이름은 **PascalCase** 사용
- `common/`에 생성 금지 — 반드시 `features/`에 생성
- 다른 feature를 직접 import 금지 — cross-feature는 `widgets/`로 분리
