---
description: React 컴포넌트의 메모리 누수 패턴을 탐지하고 수정합니다. useEffect 클린업 누락, 이벤트 리스너, 타이머, 구독 해제 등을 검사합니다.
---

# Memory Leak — 메모리 누수 탐지 및 수정

`/memory-leak [파일]` 실행 시 파일 경로가 주어지면 해당 파일만 검사하고, 없으면 `src/` 전체를 대상으로 검사합니다.

---

## Phase 1 — 분석 (읽기만, 변경 없음)

아래 6가지 패턴을 Grep + 파일 읽기로 탐지합니다.

### A. useEffect 클린업 함수 누락

`useEffect` 가 있지만 `return () => { ... }` 클린업이 없는 경우:

탐지 대상 패턴 (클린업 필수):

1. **이벤트 리스너 등록**

   ```ts
   window.addEventListener(...)
   document.addEventListener(...)
   element.addEventListener(...)
   ```

   → `removeEventListener` 없이 컴포넌트 언마운트 시 리스너 잔류

2. **타이머**

   ```ts
   setInterval(...)
   setTimeout(...)
   ```

   → `clearInterval` / `clearTimeout` 없이 타이머 계속 동작

3. **ResizeObserver / IntersectionObserver / MutationObserver**

   ```ts
   new ResizeObserver(...)
   new IntersectionObserver(...)
   ```

   → `.disconnect()` 없이 Observer 잔류

4. **WebSocket**
   ```ts
   new WebSocket(...)
   ```
   → `.close()` 없이 연결 유지

### B. Firebase / 외부 서비스 구독 해제 누락

Firebase 실시간 구독 패턴:

```ts
onSnapshot(...)
onValue(...)
onAuthStateChanged(...)
```

→ 반환된 `unsubscribe` 함수를 클린업에서 호출하지 않는 경우

Grep 패턴: `onSnapshot|onValue|onAuthStateChanged|onIdTokenChanged`

### C. 언마운트 후 상태 업데이트

비동기 작업(fetch, setTimeout) 완료 후 컴포넌트가 이미 언마운트된 상태에서 `setState` 호출:

```ts
useEffect(() => {
  fetch("/api/data").then((data) => {
    setState(data); // 언마운트 후 호출 시 경고 또는 누수
  });
}, []);
```

→ `AbortController` 또는 마운트 상태 플래그 패턴 미적용 탐지

Grep 패턴: `useEffect` 내부에 `fetch(` 또는 `axios.` 가 있고 cleanup 없는 경우

### D. Zustand 외부 구독

```ts
store.subscribe(...)
```

→ 반환된 `unsubscribe` 를 클린업에서 호출하지 않는 경우

Grep 패턴: `\.subscribe\(`

### E. 이벤트 에미터 / 커스텀 이벤트

```ts
eventEmitter.on(...)
EventTarget.addEventListener(...)
```

→ `.off()` / `removeEventListener()` 없이 리스너 등록

### F. 클로저로 인한 대용량 데이터 참조 유지

`useRef`, `useCallback`, `useMemo`의 의존성 배열에 대용량 객체/배열이 포함되어
클로저가 참조를 해제하지 못하는 패턴 — 코드 읽기로 판단합니다.

---

## Phase 2 — 보고

아래 형식으로 출력합니다:

```
## 메모리 누수 분석 결과

### ❌ 누수 확인 (즉시 수정 필요)
- src/features/chat/ui/ChatWindow.tsx:34
  window.addEventListener('resize', handler) — removeEventListener 클린업 누락

- src/features/dashboard/api/dashboard.ts:12
  onSnapshot(query, callback) — unsubscribe 클린업 누락

### ⚠️ 누수 가능성 (수정 권장)
- src/features/blog/ui/BlogDetail.tsx:18
  fetch() 비동기 후 setState — AbortController 미적용, 언마운트 후 업데이트 가능

- src/shared/hooks/useResize.ts:8
  setInterval(tick, 1000) — clearInterval 클린업 누락

### 💡 검토 권장
- src/features/home/ui/Introduction.tsx:45
  store.subscribe() — Zustand 구독 해제 여부 확인 필요

### ✅ 이상 없음
- useEffect 클린업: src/features/guestbook 전체 이상 없음
```

항목별로 수정 여부를 사용자에게 확인합니다.

---

## Phase 3 — 수정 (사용자 확인 후)

사용자가 OK한 항목에 대해서만 수정합니다.

### 수정 가이드

#### 이벤트 리스너 클린업

```tsx
// before
useEffect(() => {
  window.addEventListener("resize", handleResize);
}, []);

// after
useEffect(() => {
  window.addEventListener("resize", handleResize);
  return () => {
    window.removeEventListener("resize", handleResize);
  };
}, []);
```

#### 타이머 클린업

```tsx
// before
useEffect(() => {
  const timer = setInterval(tick, 1000);
}, []);

// after
useEffect(() => {
  const timer = setInterval(tick, 1000);
  return () => clearInterval(timer);
}, []);
```

#### Observer 클린업

```tsx
// before
useEffect(() => {
  const observer = new ResizeObserver(callback);
  observer.observe(ref.current);
}, []);

// after
useEffect(() => {
  const observer = new ResizeObserver(callback);
  if (ref.current) observer.observe(ref.current);
  return () => observer.disconnect();
}, []);
```

#### Firebase 구독 클린업

```tsx
// before
useEffect(() => {
  onSnapshot(query, (snapshot) => {
    setData(snapshot.docs);
  });
}, []);

// after
useEffect(() => {
  const unsubscribe = onSnapshot(query, (snapshot) => {
    setData(snapshot.docs);
  });
  return () => unsubscribe();
}, []);
```

#### fetch AbortController 적용

```tsx
// before
useEffect(() => {
  fetch("/api/data")
    .then((res) => res.json())
    .then((data) => setState(data));
}, []);

// after
useEffect(() => {
  const controller = new AbortController();
  fetch("/api/data", { signal: controller.signal })
    .then((res) => res.json())
    .then((data) => setState(data))
    .catch((err) => {
      if (err.name === "AbortError") return; // 정상 취소
    });
  return () => controller.abort();
}, []);
```

#### Zustand 구독 클린업

```tsx
// before
useEffect(() => {
  store.subscribe((state) => {
    doSomething(state);
  });
}, []);

// after
useEffect(() => {
  const unsubscribe = store.subscribe((state) => {
    doSomething(state);
  });
  return () => unsubscribe();
}, []);
```

수정 후 `tsc --noEmit`으로 타입 오류 없는지 확인합니다.

---

## 주의사항

- `useEffect` 의존성 배열 변경 없이 **클린업 함수만** 추가합니다. 기존 로직은 건드리지 않습니다.
- AbortController fetch 패턴에서 `AbortError`는 반드시 catch하여 무시해야 합니다.
- Firebase `onSnapshot`은 동일 query에 대해 중복 구독이 발생하지 않도록 의존성 배열도 함께 검토합니다.
- SWR을 사용하는 컴포넌트는 SWR이 자체적으로 구독을 관리하므로 별도 클린업이 불필요합니다.
- 수정 중 기존 동작이 변경되지 않도록 주의하며, 확신이 없으면 사용자에게 먼저 공유합니다.
