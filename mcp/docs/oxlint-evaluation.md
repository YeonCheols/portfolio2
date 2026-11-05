# MCP Oxlint 평가 — 이슈 #172

## 범위와 결론

이번 평가는 MCP만 대상으로 합니다. 웹 앱의 package.json·lockfile·ESLint·CI는 변경하지 않았으며 Next.js와 웹 FSD 규칙은 사용하지 않습니다.

평가 당시 MCP에는 ESLint lint 명령이 없었습니다. 따라서 웹 ESLint를 가져오는 대신 비교 전용 MCP 프로필을 만들었습니다. 아래 수치는 도입 전 비교 프로필의 차이이며 기존 CI의 ESLint 비용을 줄였다는 의미가 아닙니다. 평가 후 사용자 요청에 따라 MCP Oxlint를 CI와 Compose 검증에 적용했습니다.

정한 MCP 프로필과 현재 코퍼스·대표 fixture 범위에서는 Oxlint와 React JS 플러그인을 결합한 후보가 비교용 ESLint와 같은 진단을 반환했습니다. 네이티브만 쓰는 후보는 현재 코드의 진단은 같지만 React class 예제 2개를 놓칩니다. 비교한 일부 규칙이 같다는 것을 전체 ESLint 호환성으로 일반화하지 않습니다.

## 재실행과 도구 소유권

```sh
pnpm --dir mcp lint:evaluate
# 결과를 별도 파일에 보존하는 경우입니다.
pnpm --dir mcp lint:evaluate /tmp/mcp-oxlint-evaluation.json
```

모든 실행기와 플러그인은 MCP workspace의 devDependencies가 소유하며 루트 웹 node_modules를 참조하지 않습니다. 정식 설정 `.oxlintrc.json`은 검증한 하이브리드 후보를 사용합니다. 네이티브 비교 설정은 별도 이름으로 두고 실행 시 명시합니다. 비교용 ESLint에서도 `--no-config-lookup`으로 웹 설정을 제외합니다.

- Oxlint 1.91.0을 고정했습니다. Node `^20.19.0 || >=22.12.0`이 필요합니다.
- 비교용 ESLint 9.39.2, TypeScript parser 8.72.1을 고정했습니다.
- React 7.37.5, Hooks 7.0.1, JSX accessibility 6.10.2의 ESLint 플러그인을 비교 도구로 고정했습니다. React 플러그인은 하이브리드 후보에서도 사용합니다.
- MCP 기존 package metadata·snapshot과 각 workspace의 runtime dependency importer가 모두 유지됨을 확인했습니다. 웹 lockfile은 변경하지 않았습니다.

## MCP 비교 규칙

백엔드·공통 계약에 공통 오류 규칙 15개를 적용합니다. debugger, async Promise executor, 도달 불가능한 코드, 잘못된 optional chaining, 중복 키, getter 반환, 정밀도 손실, 잘못된 typeof·NaN 비교 등을 검사합니다. TypeScript parser를 사용하지만 타입 정보를 요구하는 규칙은 활성화하지 않습니다. 타입 검사와 기존 테스트를 대체하지 않습니다.

콘솔에는 Hooks·JSX·접근성·React lifecycle 규칙 11개를 추가합니다. 비교 규칙의 실제 소유자는 `scripts/lint-evaluation/profile.mjs`이며 결과 JSON에도 전체 이름을 기록합니다. 이번 비교는 ESLint 전체 recommended 규칙을 모두 옮긴 작업이 아닙니다.

네이티브 후보는 두 React legacy 규칙을 제외하고 같은 규칙·심각도로 구성했습니다. 하이브리드 후보는 콘솔 override에서만 `react-js` alias로 기존 React JS 플러그인의 no-deprecated·require-render-return을 사용합니다. require-render-return은 Oxlint의 nursery 후보에도 있지만 이번 네이티브 프로필에서는 실험 규칙을 활성화하지 않았습니다. 영구적인 미지원 규칙이라는 뜻은 아닙니다.

no-dupe-args는 Oxlint의 독립 lint 규칙으로 등록돼 있지 않아 새 공통 비교 프로필에 포함하지 않았습니다. 중복 매개변수 같은 문법 오류는 parser·TypeScript 검사가 담당하며 이 평가에서 동일한 lint 규칙으로 검증한 것으로 표시하지 않습니다.

## 측정 방법

기준 커밋은 `891e51bf4136acaca036048ca60576a1c6b8b080`입니다. 제품 소스를 바꾸지 않았으며 소스 digest와 측정 시각을 결과에 기록했습니다. macOS arm64, Apple M4 10 logical CPU, Node 24.19.0에서 실행했습니다.

각 영역·프로필은 최초 1회와 후속 5회를 실행하며 후속 5회의 중앙값을 사용합니다. 프로필 순서를 순환하고 직렬로 실행합니다. 매번 새 CLI 프로세스를 만들고 lint 캐시는 사용하지 않습니다. OS 파일 캐시를 비우지 않아 최초 측정도 엄격한 cold-cache 결과가 아닙니다. 설정·플러그인 로딩과 프로세스 시작 비용도 포함합니다.

기존 테스트 파일도 검사 범위에 포함합니다. 두 실행기의 파일 수와 반복 측정 간 진단 안정성을 확인합니다. backend 79개·console 40개·contracts 3개이며 전체는 122개입니다.

## 측정 결과

- 전체 122개: ESLint 903.65ms, 네이티브 41.86ms, 하이브리드 243.59ms입니다. 각각 약 21.6배·3.7배의 차이입니다.
- 백엔드 79개: ESLint 755.44ms, 네이티브 40.57ms, 하이브리드 157.82ms입니다.
- 콘솔 40개: ESLint 615.20ms, 네이티브 40.44ms, 하이브리드 252.09ms입니다.
- 계약 3개: ESLint 391.93ms, 네이티브 38.04ms, 하이브리드 154.10ms입니다.

백엔드·계약은 세 프로필 모두 오류·경고 0개입니다. 콘솔은 모두 오류 0개·role-supports-aria-props 경고 1개이며 파일·규칙·심각도별 개수 차이는 없습니다. 기존 제품 코드를 자동 수정하지 않았습니다.

백엔드만 검사해도 하이브리드 설정의 JS 플러그인 로딩 비용이 포함될 수 있습니다. 두 후보의 시간 차이는 확인했지만 per-rule profiler로 비용을 분해하지 않았으므로 특정 내부 함수가 병목이라고 판정하지 않습니다. 실제 도입은 백엔드·계약에 네이티브, 콘솔에 필요한 플러그인을 선택하는 구성을 검토할 수 있습니다.

평가 전 CI에는 MCP lint가 없었으므로 이 결과로 CI 전체가 21배 빨라진다고 주장하지 않습니다. 이번 도입은 기존 CI에 새 검사 비용을 추가하며, 그 비용이 작다는 근거로 측정값을 사용합니다.

## 대표 사례 검증

실제 소스를 바꾸지 않고 격리된 임시 MCP 프로젝트에 fixture 12개를 생성했습니다. ESLint가 기대 위반을 검출하는지 먼저 확인하며 정상 예제도 두었습니다.

- debugger, async Promise executor, unreachable, unsafe optional chaining 4개는 세 프로필 모두 검출했습니다.
- JSX key, 조건부 Hook, effect dependency, ARIA 4개도 세 프로필 모두 검출했습니다.
- deprecated lifecycle·render 반환 누락 2개는 네이티브에서 빠지고 하이브리드에서 ESLint와 같이 검출했습니다.
- 정상 TypeScript 계약과 정상 함수형 React 컴포넌트 2개는 세 프로필 모두 허용했습니다.

macOS 임시 경로의 symlink 표기 차이로 Oxlint override가 fixture에서 매칭되지 않는 초기 평가기 문제를 확인했습니다. 임시 프로젝트 경로를 realpath로 확정해 실제 파일·config·cwd를 일치시킨 뒤 재측정했습니다. 이 초기 결과를 미지원 규칙의 근거로 사용하지 않습니다.

원본은 [oxlint-evaluation-results.json](oxlint-evaluation-results.json)에 있습니다. 진단은 도구별 namespace를 정규화하고 파일·규칙·심각도별 다중집합으로 비교합니다. 메시지·위치·자동 수정 결과의 완전한 동등성까지 검증한 것은 아닙니다. 오류·설정 실패·잘못된 JSON·파일 수 차이·불안정한 진단은 평가 자체의 실패로 처리하고, lint 위반 때문에 CLI가 1로 종료한 경우는 평가 데이터로 보관합니다.

## 구조 규칙과 도입 판단

MCP의 modules/interfaces/infrastructure 및 패키지 경계는 FSD 규칙으로 대체하지 않습니다. 기존 `directory-boundary.test.ts`와 `apps/backend/src/runtime-boundary.test.ts`를 유지하고 5개 테스트의 통과를 확인했습니다.

1. MCP 전용 평가 단계는 완료했으며 웹 평가 산출물과 웹 의존성 변경은 정리했습니다.
2. 백엔드·공통 계약에 네이티브를 사용하는 가치는 있습니다. 선택한 오류 검사 15개와 해당 fixture에서 누락이 없고 실행 비용이 작습니다.
3. 콘솔은 네이티브가 현재 코드와 함수형 React의 대표 사례를 검사합니다. React legacy 검사까지 정책에 포함하려면 하이브리드 또는 별도 동등성 검증이 필요합니다. 하이브리드도 현재 측정에서 전체 약 0.24초입니다.
4. JS 플러그인 API는 alpha이므로 버전 고정과 fixture 회귀 확인이 필요합니다. 실제 Linux·Node 20 CI 성능, 모든 lint 규칙, 타입 기반 lint와 자동 수정 결과는 아직 검증하지 않았습니다.
5. 평가 후 하이브리드 후보를 정식 `lint` 명령과 기존 CI job에 연결했습니다. 오류는 차단하고 기존 접근성 경고 1개는 warning으로 유지합니다. 구조 테스트와 웹 ESLint도 유지합니다.

제품 src를 바꾸지 않는 개발 도구·설정·CI 변경이므로 제품용 Jest 테스트는 추가하지 않았습니다. 대신 실행 결과 비교·fixture·파일 범위·기존 MCP 구조 검사·타입 검사를 검증 근거로 사용합니다. 제품 코드와 runtime 의존성은 변경하지 않았으며 실제 모델 호출·서버 상시 실행·배포는 수행하지 않았습니다.

## QA와 리뷰

- 반복 평가와 fixture 12개, 기존 구조 경계 테스트 5개, MCP workspace 타입 검사, 전체 포맷 검사 및 스크립트 문법 검사가 통과했습니다.
- 별도 임시 workspace에서 pnpm 9.15.9의 frozen/offline lockfile 검증을 통과했습니다. 기존 설치 폴더의 재설치 확인 프롬프트는 설치 성공 근거로 사용하지 않았습니다.
- Linux Alpine·Node 20.20.2에서 Docker workspace를 새로 빌드하고 lint·fixture 검증·타입·MCP 전체 테스트·HTTP/PDF 빌드 검증을 통과했습니다. 기존 React 콘솔 테스트의 jsdom navigation 안내는 남아 있지만 테스트는 성공했습니다.
- `lint:verify`는 benchmark 대신 대표 fixture만 실행하며 실제 정식 설정을 읽습니다. 오류가 존재할 때 종료 1, 경고만 있으면 종료 0을 확인하고 React JS 플러그인의 보완을 검증합니다. CI의 실제 소스 검사는 Oxlint로만 수행하고 ESLint는 fixture의 비교 기준으로 사용합니다.
- 로컬 리뷰에서 파일별 규칙 적용, 임시 파일 정리, 도구 오류와 lint 진단의 구분, 웹·MCP 의존성 경계 및 runtime 의존성 보존을 확인했습니다. Docker에 정식·비교 설정을 포함하고 Compose 검증과 CI에서 lint·회귀 검증을 실행합니다.
- 실제 GitHub Actions는 아직 실행하지 않았습니다. Linux 컨테이너에서 같은 MCP 명령을 검증했으며 workflow는 actionlint로 확인합니다. 전체 ESLint 규칙·타입 기반 lint·자동 수정 동등성과 Linux 성능 수치는 검증 범위에 포함하지 않습니다.

## 공식 근거

- [Oxlint JS 플러그인](https://oxc.rs/docs/guide/usage/linter/js-plugins.html)은 alpha 상태와 alias 사용을 설명합니다.
- [Oxlint 설정](https://oxc.rs/docs/guide/usage/linter/config.html)은 파일별 override와 plugin 설정을 설명합니다.
- [단계적 마이그레이션](https://oxc.rs/docs/guide/usage/linter/migrate-from-eslint.html)은 규칙 차이의 확인과 기존 검사 유지를 설명합니다. 이번 MCP 비교 프로필은 웹 ESLint 변환 산출물을 사용하지 않습니다.
