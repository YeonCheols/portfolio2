---
description: FSD(Feature-Sliced Design) 구조 개편 지침. 파일 이동, 레이어 분류, 새 컴포넌트/모듈 작성 시 FSD 원칙을 적용할 때 사용.
---

# FSD 구조 개편 지침

이 프로젝트는 **Feature-Sliced Design(FSD)** 아키텍처로 전환 중입니다.
코드를 작성하거나 이동할 때 아래 규칙을 반드시 따르세요.

---

## 현재 디렉터리 구조 (마이그레이션 중)

```
src/
  app/          # (예정) 앱 진입점, Provider, 전역 설정
  pages/        # Next.js 페이지 라우트 (thin layer — 컴포지션만)
  modules/      # → features/ 로 이전 대상 (feature별 UI + 로직)
  shared/       # 공유 유틸리티 (이미 부분 마이그레이션 완료)
    api/
    config/
    helpers/
    hooks/
    lib/
    styles/
    types/
    ui/         # 범용 UI 컴포넌트 (디자인 시스템)
  common/       # → shared/ 로 이전 대상 (구 유틸리티 모음)
  contents/     # MDX 등 정적 콘텐츠
  services/     # → shared/api/ 또는 entities/ 로 이전 대상
```

---

## FSD 레이어 계층 (위 → 아래 의존 방향)

```
app → pages → widgets → features → entities → shared
```

- **상위 레이어는 하위 레이어만 import 가능**
- **같은 레이어 간 cross-import 금지** (shared 제외)
- **하위 레이어가 상위 레이어를 import 하면 위반**

| 레이어 | 역할 | 현재 대응 디렉터리 |
|--------|------|--------------------|
| `shared` | 범용 유틸, UI 킷, 타입 | `shared/`, `common/` |
| `entities` | 비즈니스 엔티티 (모델, API 스키마) | `services/` 일부 |
| `features` | 사용자 인터랙션, 액션 단위 기능 | `modules/` |
| `widgets` | 복합 UI 블록 (features + entities 조합) | - |
| `pages` | 라우트 진입점 (컴포지션만) | `pages/` |
| `app` | Provider, 전역 설정, 앱 부트스트랩 | - |

---

## 슬라이스 내부 구조

각 feature/entity/widget은 아래 구조를 따릅니다:

```
features/blog/
  ui/           # UI 컴포넌트
  model/        # 상태, 스토어, 타입
  api/          # API 호출
  lib/          # 유틸
  index.ts      # Public API (외부에서는 반드시 index.ts로만 접근)
```

**Public API 원칙**: 외부에서 슬라이스 내부를 직접 import 금지.
항상 `features/blog` → `features/blog/index.ts` 경유.

---

## 분류 기준

### `shared/ui/` 에 넣는 것
- 특정 비즈니스 로직이 없는 순수 UI 컴포넌트
- Button, Card, Loading, Image, Breakline, EmptyState 등
- 현재: `common/components/elements/`, `shared/ui/` → 여기로 통합

### `shared/` 에 넣는 것
- 프로젝트 전반에서 쓰는 hooks, helpers, types, config, lib
- 현재: `common/hooks/`, `common/helpers/`, `common/types/` → `shared/`로 이전

### `features/` 에 넣는 것
- 페이지별 독립 기능 단위 (blog, guestbook, dashboard 등)
- 현재: `modules/{feature}/` → `features/{feature}/`로 이전

### `entities/` 에 넣는 것
- API 응답 타입, 비즈니스 모델, 데이터 스키마
- 현재: `services/*.ts` API 함수들의 타입/모델 분리 후 이전

### `pages/` 유지 기준
- Next.js 라우팅 파일만 유지
- 실제 UI는 `features/` 또는 `widgets/`에서 import
- pages 파일 내 로직 최소화 (레이아웃 + 데이터 패싱만)

---

## 마이그레이션 우선순위

1. `common/components/elements/*` → `shared/ui/`
2. `common/{hooks,helpers,types,libs}/*` → `shared/{hooks,helpers,types,lib}/`
3. `modules/{feature}/*` → `features/{feature}/`
4. `services/*.ts` → `shared/api/` (범용) 또는 `entities/{domain}/api/` (도메인별)
5. `common/layouts/`, `common/sidebar/` → `widgets/layout/` (신규 생성)

---

## 금지 사항

- `features/` 내 슬라이스가 다른 슬라이스를 직접 import하는 것
- `shared/`에 특정 feature 종속 코드를 넣는 것
- `pages/`에 비즈니스 로직을 직접 작성하는 것
- `common/`에 새 파일 추가 (마이그레이션 대상이므로 신규 코드는 반드시 FSD 레이어에)

---

## 새 코드 작성 시 체크리스트

- [ ] 어느 레이어에 속하는지 먼저 결정
- [ ] `index.ts`에 Public API export 추가
- [ ] 상위 레이어 import 없는지 확인
- [ ] `common/`이 아닌 FSD 레이어에 파일 생성
- [ ] 비즈니스 로직이 없는 컴포넌트는 `shared/ui/`에 배치
