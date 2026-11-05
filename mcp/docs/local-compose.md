# 로컬 Compose 실행과 검증

`docker-compose.yml`은 로컬 서버와 일회성 검증을 같은 Dockerfile의 Node 20·pnpm workspace에서 실행합니다. 호스트 포트폴리오 웹 앱의 node_modules나 환경파일을 마운트하지 않습니다.

## 실행

Docker 엔진과 Compose 플러그인, portfolio-config 비공개 저장소를 읽을 수 있는 GitHub 인증을 준비합니다. MCP 루트에서 실행합니다.

```sh
pnpm local:up
pnpm local:down
pnpm verify:container
```

상위 저장소에서는 `pnpm --dir mcp local:up`처럼 실행합니다. 컨테이너의 의존성·빌드·검증은 컨테이너 내부에서 수행하므로 호스트에 프로젝트 의존성을 설치할 필요는 없습니다.

`local:up`은 이미지를 빌드하고 서버의 헬스체크를 기다립니다. 기본 연결은 `http://localhost:8080`이며 외부 인터페이스에는 포트를 노출하지 않습니다. 필요하면 `MCP_LOCAL_PORT=18080 pnpm local:up`처럼 호스트 포트만 변경할 수 있습니다. OAuth를 포함한 전체 사용에는 중앙 설정의 MCP 공개 URL과 포트도 일치해야 합니다.

## 설정과 인증

- 로컬 서버의 설정 조회 명령은 `portfolio-config run --app portfolio-mcp --env development --ref master`로 고정합니다. Compose에 실제 연결 값이나 모델 키를 복제하지 않습니다.
- CLI는 서버 시작 시 development 설정을 조회·검증하고 프로세스에 공급합니다. 조회 실패 시 서버를 시작하지 않습니다. 이미 실행 중인 서버의 설정 변경에는 재시작이 필요합니다.
- 동적 AI 모델 공급자·모델명·키는 현재 서버 구현대로 새 생성 요청마다 portfolio-api의 환경별 활성 설정에서 조회합니다. Compose에 저장하지 않습니다.
- 시작 도구는 제공된 `GH_TOKEN`을 사용하고, 없으면 저장소의 `git gh` 별칭을 우선하여 호스트 인증을 확인합니다. 독립 저장소에 별칭이 없으면 일반 `gh`를 사용합니다. 토큰을 파일·명령 인자·로그로 출력하지 않습니다.
- Linux CLI 설치에는 BuildKit secret으로 인증을 전달합니다. 공통 `scripts/install-config-cli.sh`가 GitHub latest 정식 릴리스를 조회하고 같은 태그의 공식 설치기·체크섬 검증으로 바이너리를 설치합니다. 조회·다운로드 실패나 잘못된 태그에는 시작을 거부하며 기존 버전으로 대체하지 않습니다.
- CLI가 받는 인증은 컨테이너 실행 시 환경으로 전달합니다. 환경파일이나 인증 디렉터리를 이미지에 복사하지 않습니다. `docker compose config` 등으로 전체 환경값을 출력하지 않고 구문 검증에는 `config --quiet`를 사용합니다.

## 검증

`verify:container`는 인증이나 실제 설정을 조회하지 않습니다. `workspace` target을 빌드하고 다음 검증을 수행한 뒤 컨테이너를 제거합니다.

1. `pnpm type-check`로 세 패키지를 검사합니다.
2. `pnpm test:ci`로 백엔드·공통 계약·구조 테스트와 콘솔 테스트를 실행하고 커버리지를 수집합니다.
3. `pnpm check:build`로 실제 산출물의 HTTP·에셋·MCP 도구 등록·한글 PDF 생성을 확인합니다.

콘솔 테스트는 파일 병렬 실행을 끄고 같은 순차 실행 조건을 사용합니다. 제한된 컨테이너 CPU에서 lazy import가 다른 테스트와 경쟁해 기본 대기시간을 넘는 문제를 방지하며, 테스트 기대값이나 비동기 대기시간은 완화하지 않습니다.

검증 컨테이너의 커버리지는 해당 일회성 컨테이너 안에 생성됩니다. 현재 CI는 자체 MCP 실행기로 호스트 작업 디렉터리에 커버리지를 기록하며, Compose로 CI 실행까지 전환할 때는 별도 산출물 보존 절차가 필요합니다.

## 이미지 경계

- `workspace`는 의존성·소스·빌드·테스트 실행기를 포함하며 실제 설정 조회 없이 빌드합니다.
- `local`은 같은 workspace에 GitHub CLI와 portfolio-config를 추가합니다. Compose 서버가 development 명령으로 실행합니다.
- 최종 `runtime`은 기존 운영 배포용 target입니다. workflow의 `configcli` context를 받아 기존 시작 스크립트를 실행하며 Compose 설정을 사용하지 않습니다.

참고한 동작은 Docker의 [일회성 run 명령](https://docs.docker.com/reference/cli/docker/compose/run/)과 [빌드 secret](https://docs.docker.com/build/building/secrets/)에 따릅니다.

## 최신 CLI와 재배포

`local:up`은 인증 후 최신 정식 태그를 한 번 조회하여 Docker build arg로 전달합니다. 새 태그가 나오면 CLI 설치 단계의 캐시가 갱신됩니다. 직접 `docker compose up`을 실행하면 이 조회 절차를 거치지 않으므로 표준 실행 명령은 `pnpm local:up`입니다.

운영 workflow도 같은 설치 도구로 최신 태그를 한 번 확정한 뒤 그 버전을 설치합니다. 새 CLI로 production 설정 스키마를 검증한 뒤에만 이미지 빌드·배포를 진행합니다. 설치한 태그는 Actions summary와 이미지 label에 기록하며, 이미지 태그는 코드 SHA와 실행 ID를 함께 사용합니다. CLI 버전 갱신만을 위해 MCP 코드를 수정할 필요는 없습니다.

이 변경이 master에 반영되면 GitHub Actions의 `Deploy MCP`에서 `Run workflow`를 실행하여 코드 변경 없이 재배포할 수 있습니다. 운영 배포는 master에서만 실행합니다. CLI 릴리스가 발행됐다는 이유만으로 MCP가 자동 재배포되지는 않습니다. 저장소 간 릴리스 트리거 연결은 별도 구성입니다.

CLI는 빌드 시 선택하여 이미지에 포함합니다. 이미 실행 중인 서버나 기존 이미지의 CLI가 자동 교체되지는 않습니다. 환경설정은 서버 시작 시 `master`에서 읽으므로 CLI 버전과 설정 ref는 별개의 기준입니다. 롤백은 이전 실행 ID의 이미지 또는 digest를 선택합니다.
