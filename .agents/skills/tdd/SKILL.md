---
name: tdd
description: Next.js + React 포트폴리오에서 Red-Green-Refactor 사이클로 코드를 수정한다. src/ 코드를 수정하는 모든 작업(기능 추가, 버그 수정, 리팩터링)에서 반드시 사용하며, 사용자가 "TDD로", "테스트 먼저"를 요청할 때도 사용한다.
---

# TDD (Red → Green → Refactor)

## 체크리스트

```
- [ ] 1. 요구사항을 테스트 케이스 목록으로 정리 (정상/경계/예외)
- [ ] 2. Red: 실패하는 테스트 1개 작성 → 실패 확인
- [ ] 3. Green: 테스트를 통과하는 최소 구현 → 통과 확인
- [ ] 4. Refactor: 중복 제거/정리 → 여전히 통과 확인
- [ ] 5. 남은 케이스에 대해 2~4 반복
- [ ] 6. 관련 테스트 + pnpm lint 실행
```

## 원칙: 코드 수정 = 테스트 추가/수정

모든 코드 수정에는 **수정한 파일과 관련된 테스트 코드의 추가 또는 수정이 반드시 함께 포함**되어야 한다.

- 수정한 파일(`<name>.ts` / `<name>.tsx`)마다 대응하는 테스트(`<name>.test.ts` 또는 `<name>.test.tsx`)를 확인한다
  - 테스트 파일이 없으면 새로 만든다
  - 있으면 변경된 동작에 맞게 케이스를 추가하거나 기존 기대값을 수정한다
- 동작이 바뀌면 그 동작을 검증하는 케이스가 있어야 하고, 버그 수정에는 해당 버그를 재현하는 케이스가 있어야 한다
- 리팩터링처럼 동작이 바뀌지 않는 수정은 기존 테스트로 동작이 보호되는지 확인하고, 커버되지 않는 경로가 있으면 테스트를 먼저 보강한다
- 테스트 대상이 아닌 파일(페이지 thin wrapper, `index.ts` re-export, MDX 본문, `*.md`, 설정, 스타일만)만 바꾸는 경우는 예외다. 대신 완료 보고에 테스트를 추가하지 않은 파일과 그 이유를 적는다
- 테스트 없이 구현만 바뀐 상태로 작업을 끝내지 않는다

## 규칙

- 구현 코드보다 테스트를 **먼저** 작성하고, 실패를 실제로 실행해 확인한다 (실패 이유가 "기능 미구현"이어야 함. import 오류 등은 Red가 아님)
- 한 사이클에 테스트 1개만 추가한다
- Green 단계에서는 테스트를 통과시키는 데 필요한 코드만 작성한다
- 테스트를 통과시키려고 테스트 기대값을 바꾸지 않는다
- 브라우저와 네트워크가 필요한 화면 검증은 단위 테스트를 대체하지 않는다. 개발 서버는 사용자가 실행 중일 때만 확인한다

## 파일 위치와 실행

- 단위 테스트: 대상 파일 옆 `<name>.test.ts(x)`
- Jest는 `next/jest`, `jest-environment-jsdom`, `@/` → `src/` 매핑을 쓴다 (`jest.config.js`)
- 단일 파일 실행: `pnpm test -- src/shared/lib/cn.test.ts`
- 감시 모드: `pnpm test:watch`
- 컴포넌트는 `@testing-library/react`로 렌더와 사용자 동작을 검증한다. 구현 세부(클래스 문자열 전체, 내부 state 변수명)는 단정하지 않는다

## 순수 함수 템플릿

```ts
import cn from "@/shared/lib/cn";

describe("cn", () => {
  it("falsy 값은 클래스 문자열에서 뺀다", () => {
    expect(cn("a", false && "b", "c")).toBe("a c");
  });
});
```

## 컴포넌트 템플릿

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { Button } from "./Button";

describe("Button", () => {
  it("클릭하면 onClick을 호출한다", async () => {
    const user = userEvent.setup();
    const onClick = jest.fn();
    render(<Button onClick={onClick}>저장</Button>);

    await user.click(screen.getByRole("button", { name: "저장" }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
```

## 테스트 작성 기준

- 테스트명은 한국어로 "~하면 ~한다" 형식
- 비즈니스 규칙, 분기, 빈 값, 에러 상태를 우선 검증한다
- API 클라이언트는 `fetch`/`axios`를 모킹하고 실제 네트워크와 `.env`에 의존하지 않는다
- `pages/` 라우트 자체보다 `features/`와 `shared/`의 동작을 테스트한다

## 완료 보고

다음을 요약한다.

- 수정한 파일과 그에 대응해 추가하거나 수정한 테스트 파일
- 사이클별로 추가한 테스트 케이스
- 테스트를 추가하지 않은 파일이 있으면 그 이유. 문장은 `~습니다`로 끝낸다
- 최종 `pnpm test` 결과(통과/실패 수)
