---
description: React/Next.js 성능 최적화 이슈를 탐지하고 수정합니다. 불필요한 리렌더, 번들 크기, 이미지 최적화, 코드 스플리팅 등을 검사합니다.
---

# Perf Check — 성능 최적화 검사 및 수정

`` 에 파일 경로가 있으면 해당 파일만 검사.
없으면 `src/` 전체를 대상으로 검사합니다.

---

## Phase 1 — 분석 (읽기만, 변경 없음)

아래 6가지 항목을 병렬로 검사합니다.

### A. 불필요한 리렌더 (Re-render)

다음 패턴을 Grep으로 탐지합니다:

1. **인라인 객체/배열/함수** — JSX props에 매 렌더마다 새 참조가 생성되는 패턴
   ```
   value={{ ... }}   style={{ ... }}   onClick={() => ...}
   ```
   → `useMemo`, `useCallback`으로 메모이제이션 필요 여부 판단

2. **memo 미적용 컴포넌트** — props 변경 없이 부모 리렌더로 따라 렌더되는 순수 컴포넌트
   - `export default function` / `export const` 컴포넌트 중 `React.memo` 미적용
   - 단, 항상 변하는 데이터를 받는 컴포넌트는 제외

3. **useEffect 의존성 배열 이슈**
   - `[]` 빈 의존성이지만 내부에서 외부 변수 참조 → stale closure 위험
   - 의존성에 매 렌더마다 새 객체/함수 참조 포함 → 무한 루프 위험

4. **Context 과도한 사용** — 하나의 Context가 자주 변경되는 값과 거의 안 변하는 값을 함께 제공
   → Context 분리 또는 `useMemo` 적용 필요

### B. 번들 크기 최적화

1. **라이브러리 전체 import** — tree-shaking 미적용 패턴
   ```ts
   import _ from 'lodash'           // → import { debounce } from 'lodash'
   import * as Icons from 'react-icons/fa'
   ```

2. **무거운 컴포넌트 정적 import** — 초기 번들에 포함될 필요 없는 컴포넌트
   - Monaco Editor, Chart 라이브러리, Syntax Highlighter 등
   - `next/dynamic` 또는 `React.lazy` 적용 여부 확인

3. **중복 패키지 import** — 동일 기능을 여러 라이브러리에서 각각 import

### C. Next.js Image 최적화

`<img` 태그 직접 사용 여부 Grep:
- `src/` 내 `<img ` 패턴 탐지 → `next/image`의 `<Image>` 컴포넌트로 교체 대상
- `<Image>` 사용 시 `width`, `height` 또는 `fill` 누락 여부 확인
- `priority` prop 미적용 LCP 이미지 (페이지 상단 첫 번째 이미지) 확인

### D. 코드 스플리팅 / Lazy Loading

1. **페이지 파일의 heavy import** — `src/pages/*.tsx`에서 직접 import하는 무거운 컴포넌트
   → `next/dynamic(() => import(...), { ssr: false })` 적용 여부 확인

2. **SSG/SSR 활용 가능 페이지** — `getStaticProps` 없이 CSR로만 데이터 페칭하는 페이지
   → 정적 생성 가능 여부 검토

### E. SWR / 데이터 페칭 최적화

1. **중복 fetch** — 동일 API를 여러 컴포넌트에서 각각 호출 (SWR의 캐시 key 불일치)
2. **fetcher 함수 인라인 정의** — `useSWR` 두 번째 인자로 익명 함수 → 매 렌더마다 새 함수 생성
3. **조건부 fetch 패턴 오류** — 조건부로 훅 호출 시 `null` key 패턴 미사용

### F. React Key 최적화

리스트 렌더링에서:
- `key={index}` 사용 패턴 → 항목 재정렬 시 불필요한 DOM 재생성
- key 값으로 안정적 고유 ID 대신 임시 값 사용

---

## Phase 2 — 보고

아래 형식으로 출력합니다:

```
## 성능 최적화 분석 결과

### ❌ 즉시 수정 필요
- src/features/blog/ui/BlogList.tsx:23 — key={index} 사용, 안정적 ID로 교체 필요
- src/pages/playground.tsx:5 — Monaco Editor 정적 import → next/dynamic 적용 필요

### ⚠️ 수정 권장
- src/features/home/ui/Services.tsx:12 — onClick 인라인 함수, useCallback 적용 권장
- src/shared/ui/Card.tsx — React.memo 미적용, 부모 리렌더 시 따라 렌더됨

### 💡 검토 권장
- src/features/dashboard/ui/Chart.tsx — heavy 컴포넌트, lazy loading 검토
- src/pages/blog/index.tsx — CSR 전용, SSG 전환 가능 여부 검토

### ✅ 이상 없음
- Next.js Image 최적화: 모든 이미지 <Image> 컴포넌트 사용 중
```

항목별로 수정 여부를 사용자에게 확인합니다.

---

## Phase 3 — 수정 (사용자 확인 후)

사용자가 OK한 항목에 대해서만 수정합니다.

### 수정 가이드

#### `next/dynamic` 적용
```tsx
// before
import MonacoEditor from '@monaco-editor/react';

// after
import dynamic from 'next/dynamic';
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });
```

#### `useCallback` 적용
```tsx
// before
<Button onClick={() => handleClick(id)} />

// after
const handleClick_ = useCallback(() => handleClick(id), [id]);
<Button onClick={handleClick_} />
```

#### `useMemo` 적용
```tsx
// before
<Component config={{ theme: 'dark', size: 'lg' }} />

// after
const config = useMemo(() => ({ theme: 'dark', size: 'lg' }), []);
<Component config={config} />
```

#### `React.memo` 적용
```tsx
// before
const Card = ({ title, desc }: Props) => { ... };
export default Card;

// after
const Card = React.memo(({ title, desc }: Props) => { ... });
export default Card;
```

#### key 값 교체
```tsx
// before
{items.map((item, index) => <Item key={index} {...item} />)}

// after
{items.map((item) => <Item key={item.id} {...item} />)}
```

수정 후 `tsc --noEmit`으로 타입 오류 없는지 확인합니다.

---

## 주의사항

- `useCallback`/`useMemo`/`React.memo` 남용은 오히려 성능 저하를 유발합니다. **실제로 렌더가 잦은 컴포넌트**에만 적용합니다.
- 최적화 전/후 실제 렌더 횟수를 React DevTools Profiler로 검증하는 것을 권장합니다.
- 비즈니스 로직 변경 없이 **최적화만** 수행합니다.
- 확신이 없는 항목은 직접 수정하지 않고 사용자에게 먼저 공유합니다.
