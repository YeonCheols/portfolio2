# MCP 테스트 실행기 독립화

## 목적과 소유권

- `mcp/`를 별도 프로젝트로 분리해도 상위 포트폴리오 웹 앱의 의존성 없이 설치·빌드·테스트할 수 있도록 구성했습니다.
- MCP 루트 devDependencies가 Jest 29, SWC 변환기와 Jest 타입을 소유합니다. `jest.config.cjs`는 Node 환경과 MCP 내부 alias만 사용하며 웹 앱의 Next.js·setup·별칭을 가져오지 않습니다.
- `pnpm test`는 백엔드 Jest와 콘솔 Vitest를 실행합니다. 개별 실행은 `pnpm test:backend`, `pnpm test:console`이며 `pnpm test:ci`는 백엔드 커버리지까지 기록합니다. 공통 계약을 먼저 빌드해야 하므로 설치 후 `pnpm build`를 실행합니다.
- 부모 `.github/workflows`를 읽던 검사는 해당 파일의 소유자인 상위 `tests/infrastructure/deploy.workflow.test.ts`로 통합했습니다. Docker 복사 순서 검사는 MCP의 `dockerfile.test.ts`로 옮겼습니다. 중복된 시나리오를 통합하여 별도 테스트 파일은 추가하지 않았습니다.
- 상위 웹 Jest에서 MCP 전체를 제외하고 MCP용 별칭을 Jest·TypeScript 설정에서 제거했습니다. CI는 MCP의 자체 테스트 명령과 커버리지 산출물을 사용합니다.

## Red·Green 근거

- `tests/config/jest.config.test.ts`의 기존 수집 범위 테스트를 독립 MCP workspace 제외 조건으로 갱신했습니다.
- Red: `pnpm exec jest --runInBand tests/config/jest.config.test.ts`에서 MCP를 여전히 수집하는 기존 설정으로 1개 실패·1개 통과, 종료 코드 1을 확인했습니다. import·의존성 오류가 아니라 수집 경계 조건이 맞지 않아 실패했습니다.
- Green: 웹 Jest에서 MCP 전체를 제외한 뒤 같은 테스트와 배포 검사까지 11개가 통과했습니다.
- 나머지는 실행 설정·의존성과 기존 테스트의 위치를 옮기는 변경이며 운영 코드는 변경하지 않았습니다. 대체 검증으로 부모 저장소 없는 설치·빌드·테스트·타입·산출물 실행을 수행했습니다.

## QA 결과: 통과

| 항목           | 결과 | 근거                                                                                                                       |
| -------------- | ---- | -------------------------------------------------------------------------------------------------------------------------- |
| 독립 설치      | 통과 | 웹 앱·부모 node_modules·설정·민감 파일 없이 복사한 디렉터리에서 `pnpm install --offline --frozen-lockfile`이 통과했습니다. |
| 독립 빌드·타입 | 통과 | 같은 위치에서 `pnpm build`, `pnpm type-check`가 통과했습니다.                                                              |
| MCP Jest       | 통과 | 독립 위치에서 42개 스위트 331개가 통과했습니다. 커버리지를 켠 재검증도 통과했습니다.                                       |
| 콘솔 Vitest    | 통과 | 독립 위치에서 16개 파일 100개가 통과했습니다.                                                                              |
| 산출물 실행    | 통과 | 독립 위치의 `pnpm check:build`에서 HTTP·에셋·도구 등록·한글 PDF 검증 2개가 통과했습니다.                                   |
| 웹 회귀        | 통과 | 상위 웹 Jest 207개 스위트 639개와 타입 검사가 통과했습니다.                                                                |
| 린트·포맷      | 통과 | 기존 웹 린트 경고 8개가 있으며 오류는 없습니다.                                                                            |

### 발견 사항

- Jest·SWC의 실제 모듈 해석 경로가 임시 복사본 내부임을 확인했습니다. 전역 pnpm과 패키지 저장소 캐시는 사용하지만 상위 웹 앱 패키지는 사용하지 않습니다.
- 기존 콘솔 jsdom 이동 미구현 메시지와 Vite CommonJS 경고는 유지되며 테스트·빌드는 성공했습니다.
- MCP 커버리지 생성 위치가 달라져 Git·Docker context·Prettier에서 생성 산출물을 제외하고 CI 업로드 경로를 추가했습니다.

### 다음 단계

커밋과 PR은 요청 시 진행합니다. 이 변경은 아직 운영 배포하지 않았습니다.

### 불변조건과 미확인 사항

- 운영 코드·외부 계약·배포 엔트리포인트는 변경하지 않았습니다. 기존 회귀 사례와 mock을 자체 Jest에서 실행했습니다.
- CI Node 20과 운영 Alpine 이미지의 실제 실행은 후속 CI·배포에서 확인해야 합니다. 독립 설치·빌드·테스트는 현재 Mac Node 환경에서 수행했습니다.
- GitHub 배포 워크플로와 에이전트 공통 스킬은 아직 상위 저장소가 소유합니다. 이번 독립화 대상은 MCP의 설치·빌드·테스트 실행 의존성입니다.

## 코드 리뷰: ✅ 문제 없음

테스트 생산자·실행기·수집 경계와 산출물을 확인했으며 현재 변경에서 차단 사항을 발견하지 못했습니다.

### 목적과 리뷰 기준

- 요구사항: 부모 웹 앱 의존성을 피하고 MCP 전체 디렉터리 분리에 대비하도록 구성했습니다.
- 기준: local 모드이며 HEAD `595e165` 이후 unstaged·관련 untracked 변경을 검토했습니다.
- 범위 일치: 운영 기능 변경 없이 실행기·의존성·수집 경계·테스트 소유권·CI·문서를 변경했습니다.

### 발견 사항

- 없습니다.

### 데이터 흐름과 소유권

- 흐름: 웹은 웹 Jest로, MCP는 자체 Jest·콘솔 Vitest로 수집하고 각각 커버리지를 기록합니다. MCP 내부 검사는 부모 파일을 읽지 않습니다.
- 공통 소유자: 기존 공통 계약 패키지와 테스트 fixture를 그대로 사용하며 setup과 업무 로직을 복제하지 않았습니다.

### 불변조건과 시나리오

- 확인: 웹·MCP가 테스트를 중복 수집하지 않으며 기존 회귀 시나리오는 각 소유자에서 실행합니다.
- 확인: MCP만 복사한 위치에서 의존성 해석과 실제 실행이 통과했습니다. 실행 설정에 상위 웹 경로나 fallback을 추가하지 않았습니다.

### 테스트 근거

- 실행: 위 Red·Green과 독립 QA 결과를 사용했습니다. 독립 복사본은 새 manifest·lockfile·config·테스트를 사용했습니다.
- 대응: 수집 경계는 기존 웹 Jest 설정 테스트, 독립성은 실제 분리 설치·빌드·테스트·타입 검사·산출물 실행으로 검증했습니다.
- 예외: manifest·설정·문서와 테스트 이전이므로 운영 로직을 복제하는 새 테스트는 추가하지 않았습니다.

### 미확인 사항

- 새 실행기의 GitHub Actions·Alpine 실행은 아직 확인하지 않았습니다. 운영 배포를 변경하거나 수행하지 않았습니다.

### 확인한 범위

웹·MCP Jest 설정·명령과 alias, 기존 배포 테스트의 통합, 신규 devDependencies와 기존 런타임 의존성 유지, lockfile importer, CI·커버리지 경로·무시 설정·문서를 확인했습니다. lockfile의 의존성 본문은 설치 결과와 직접 의존성 버전으로 검증했습니다.

## Compose 후속 검증

- `docker-compose.yml`과 `local:up`, `local:down`, `verify:container`를 추가했습니다. 서버 설정은 portfolio-config development/master로 고정하며 동적 AI 설정은 API가 소유합니다.
- Dockerfile의 workspace target 분리 테스트가 변경 전 실패한 뒤 단계 분리 후 통과했습니다. 호스트 인증을 사용하는 up과 인증을 읽지 않는 verify·down 인자 전달도 mock 실행으로 확인했습니다.
- 실제 Node 20 Alpine 이미지에서 빌드·타입 검사·백엔드 전체 테스트·콘솔 100개·HTTP 및 PDF 2개가 통과했습니다. 최초 병렬 콘솔 실행에서 lazy import 대기가 실패했고 단일 worker 재현은 통과하여 파일 병렬 실행을 끄는 조건을 반영했습니다. 기대값과 대기시간은 바꾸지 않았습니다.
- 최초 development 서버 기동은 중앙 API localhost 주소가 HTTPS origin 검증에서 거부되어 실패했습니다. API 연결 코드를 완화하지 않고 portfolio-config PR #6으로 development·production의 API origin을 통일했습니다. Ubuntu·macOS CI 통과 후 master에 머지했습니다.
- 설정 반영 후 Compose 서버가 Healthy로 시작했습니다. 서버 프로세스의 development 모델 환경, 사용자 지정 API 도메인, bootstrap GH_TOKEN 미전달을 값 노출 없이 확인했습니다. 실제 development 활성 모델 설정 API·로컬 헬스·로그인 화면이 모두 HTTP 200으로 응답했습니다. 모델 생성 요청은 보내지 않았습니다.
- 기존 운영 서비스에는 이 미커밋 Compose·실행기 변경을 배포하지 않았습니다. portfolio-config 설정은 master에 반영됐으며 기존 프로세스에는 재시작 시 적용됩니다.
- 후속 사용자 요청으로 고정 CLI 태그를 제거했습니다. 공통 설치 도구가 빌드 시 latest 정식 태그를 선택하고, 수동 workflow 재배포로 코드 수정 없이 새 CLI를 반영하도록 구성했습니다. CLI 릴리스 자동 배포 트리거는 아직 추가하지 않았습니다.

## 최신 CLI 조회와 수동 재배포 검증

- Dockerfile·운영 workflow의 고정 설치 태그를 제거하고 `scripts/install-config-cli.sh`가 latest 정식 릴리스를 조회하도록 구성했습니다. 설치기는 확정된 같은 태그에서 가져와 기존 공식 체크섬 검증을 수행합니다.
- 고정 태그가 없어야 하는 Docker 구성 테스트가 변경 전 실패하고 변경 후 통과했습니다. latest 조회·확정 태그 설치·조회 실패·잘못된 태그·설치 실패를 fixture로 검증했습니다. 관련 스크립트·Docker 테스트 16개가 통과했습니다.
- 로컬 up은 조회한 태그를 build arg로 전달하여 새 릴리스가 생기면 CLI 설치 캐시를 갱신합니다. 실제 latest 응답·이미지 label·설치 버전이 일치하고 서버가 Healthy 및 HTTP 200으로 응답함을 확인했습니다. 확인 시점의 최신 정식 태그는 cli-v0.2.1입니다.
- 최초 새 컨테이너 검증에서 설치 도구가 필요로 하는 Bash 누락으로 127이 발생했습니다. 공통 이미지에 의존성을 선언한 뒤 Node 20 Alpine 전체 테스트·타입·빌드·콘솔 100개·HTTP 및 PDF 2개 검증이 통과했습니다. 테스트용 fallback을 추가하거나 assertion을 완화하지 않았습니다.
- 운영 runtime target도 실제 configcli build context로 빌드했습니다. workflow는 actionlint로 검사했고 관련 웹 저장소 설정 테스트 11개 및 이후 배포 검사 재실행이 통과했습니다.
- workflow_dispatch를 추가하고 master에서만 배포하도록 제한했습니다. 이미지 태그는 코드 SHA와 실행 ID를 포함하며 실제 CLI 태그를 Actions summary·이미지 label에 기록합니다. production 설정 검증 실패 시 배포를 진행하지 않습니다.
- 아직 MCP 변경은 커밋·PR·운영 배포하지 않았습니다. CLI 릴리스 발행 시 MCP 자동 배포를 호출하는 저장소 간 트리거는 추가하지 않았습니다.
