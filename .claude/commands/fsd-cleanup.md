---
description: FSD 구조에서 미사용 파일·export·슬라이스를 탐지하고 정리합니다. 삭제 전 반드시 사용자 확인을 받습니다.
---

# FSD Cleanup — 미사용 코드 탐지 및 정리

FSD 레이어 전체를 분석하여 **미사용 파일**, **미사용 export**, **빈 슬라이스**를 찾아 정리합니다.

---

## 실행 절차

### Phase 1 — 분석 (읽기만, 변경 없음)

아래 항목을 순서대로 분석합니다.

#### 1-A. 미사용 파일 탐지

`src/features/`, `src/widgets/`, `src/shared/` 내 모든 `.ts`, `.tsx` 파일에 대해:

1. 파일 경로 목록 수집 (Glob)
2. 프로젝트 전체에서 해당 파일을 import하는 곳이 있는지 Grep으로 확인
3. **예외** — 아래는 import가 없어도 미사용으로 분류하지 않음:
   - `src/pages/**` (Next.js 자동 라우팅)
   - `src/pages/api/**` (Next.js API 라우트)
   - `*/index.ts` (Public API entry point)
   - `src/shared/styles/**` (전역 스타일)

#### 1-B. 미사용 export 탐지

각 슬라이스의 `index.ts`에서 export하는 항목 중 외부에서 실제로 사용되지 않는 것을 찾습니다.

1. `index.ts`의 모든 export 이름 추출 (Grep `^export`)
2. 해당 이름이 `src/` 전체에서 import되는지 확인
3. **주의**: `shared/ui/index.ts`의 export는 보수적으로 판단 (범용 UI는 현재 미사용이어도 유지할 수 있음)

#### 1-C. 빈 슬라이스 탐지

`src/features/`, `src/widgets/` 내 각 슬라이스를 순회하여:
- `ui/`, `model/`, `api/` 디렉터리가 모두 비어있거나 없는 슬라이스
- `index.ts`만 있고 실제 파일이 없는 슬라이스

#### 1-D. 동적 import 확인

`import(` 또는 `React.lazy(` 패턴을 Grep하여 정적 분석에서 놓친 동적 import를 별도 목록으로 수집합니다. 동적 import 대상 파일은 미사용으로 분류하지 않습니다.

---

### Phase 2 — 보고

분석 결과를 아래 형식으로 사용자에게 보고합니다.

```
## FSD Cleanup 분석 결과

### 미사용 파일 (X개)
- src/features/blog/ui/OldComponent.tsx — 어디서도 import되지 않음
- ...

### 미사용 export (X개)
- src/features/blog/index.ts: `OldHook` — import되는 곳 없음
- ...

### 빈 슬라이스 (X개)
- src/features/example/ — ui/model/api 모두 없음
- ...

### 확인 필요 (동적 import 등)
- ...
```

**항목별로 삭제 여부를 사용자에게 확인합니다.** 한꺼번에 일괄 삭제하지 않습니다.

---

### Phase 3 — 정리 (사용자 확인 후)

사용자가 OK한 항목에 대해서만 아래 순서로 정리합니다.

1. **미사용 export 제거** — `index.ts`에서 해당 export 라인 삭제
2. **미사용 파일 삭제** — 파일 삭제 전 파일 내용을 간략히 보여주고 재확인
3. **빈 슬라이스 삭제** — 디렉터리 전체 삭제 전 내용 목록 보여주고 재확인
4. 정리 후 `tsc --noEmit`으로 타입 에러 없는지 확인
5. lint(`eslint src/features src/widgets src/shared`)로 FSD 위반 없는지 확인

---

## 주의사항

- **삭제는 되돌리기 어렵습니다.** 각 항목마다 사용자 확인을 받습니다.
- 파일이 미사용처럼 보여도 **동적 import**, **외부 패키지 re-export**, **테스트 파일**일 수 있습니다. 확신이 없으면 사용자에게 먼저 공유합니다.
- `shared/ui/` 컴포넌트는 현재 페이지에서 안 쓰더라도 디자인 시스템 용도로 유지할 수 있습니다. 삭제 전 반드시 확인합니다.
- 정리 중 이슈가 발생하면 직접 판단해서 수정하지 말고 사용자에게 먼저 공유합니다.
