# MCP 환경파일 가져오기

정적 환경변수는 비공개 `YeonCheols/portfolio-config` 저장소의 `environments/backend/portfolio-mcp/{development,production}.env`에서 관리합니다.
MCP 프로젝트에는 원본 값을 복제해 커밋하지 않고 CLI로 필요한 환경파일을 가져옵니다.

## 준비

- `portfolio-config` 0.2.0 이상과 GitHub CLI(`gh`)가 설치되어 있어야 합니다.
- 실행 폴더에서 `portfolio-config --version`으로 PATH 등록을 확인합니다.
- 이 저장소의 `git gh` 인증에 portfolio-config 저장소 읽기 권한이 필요합니다. 별칭이 없는 독립 프로젝트는 일반 `gh` 인증을 사용합니다.
- 중앙 파일의 `__REQUIRED_*__` 항목은 실제 값으로 채워야 합니다. 미입력 상태에서는 파일 저장을 거부합니다.

## 사용

`mcp/` 폴더에서 개발 또는 운영 환경을 선택합니다.

```sh
pnpm env:pull --env development --output .env.local
pnpm env:pull --env production --output .env.production.local
```

저장소 루트에서는 다음과 같이 실행합니다.

```sh
pnpm --dir mcp env:pull --env development --output .env.local
```

출력 경로는 MCP 폴더 기준입니다. 기존 파일은 덮어쓰지 않으며 교체가 필요할 때 `--force`를 붙입니다.
저장할 디렉터리는 미리 존재해야 합니다. 예시의 `.env.local`과 `.env.production.local`은 Git 추적에서 제외됩니다.

```sh
pnpm env:pull --env development --output .env.local --force
pnpm env:pull --env development --output .env.local --ref COMMIT_SHA
```

기본 조회 브랜치는 `master`입니다. `--ref`로 다른 브랜치나 고정 커밋을 선택할 수 있습니다.
조회·인증·검증 실패는 명령 실패로 반환하며 기존 파일을 대체하지 않습니다.
CLI는 실제 값을 터미널에 출력하지 않습니다.

## 로컬 실행과 정적 주입

파일을 가져오는 명령은 서버를 실행하거나 현재 터미널의 환경변수를 변경하지 않습니다.
`pnpm start`는 `.env` 파일을 명시적으로 읽어 서버를 시작합니다. Node 20.12 이상이 필요합니다.

```sh
pnpm env:pull --env development --output .env
pnpm build
pnpm start
```

파일 저장 없이 시작할 때 원격 설정을 직접 전달할 수도 있습니다.

```sh
pnpm start:dev
pnpm start:prod
```

두 명령은 `portfolio-config run`을 사용합니다. 고정 커밋을 선택하려면 CLI를 직접 실행합니다.

```sh
portfolio-config run --app portfolio-mcp --env production --ref COMMIT_SHA -- node dist/resume/http/server.js
```

`runtimeConfig.ts`가 서버·인증 API·이력서 API와 모델 설정 조회 연결을 시작 시 검증합니다.
모델명·공급자·모델 키를 정적 프로세스 설정에서 읽는 이전 경로는 제거했습니다.

## 동적 AI 모델 주입

정적 파일은 `RESUME_MODEL_SETTING_URL`, `RESUME_MODEL_SETTING_TOKEN`, `RESUME_MODEL_ENVIRONMENT`를 제공합니다.
이는 모델 자체가 아니라 활성 모델을 조회하기 위한 연결 정보입니다.

1. 각 MCP 도구 요청이 새 모델 클라이언트를 만듭니다.
2. 첫 모델 호출에서 portfolio-api의 해당 환경 활성 모델을 조회합니다.
3. `provider`, `modelName`, `url`, `apiKey`를 읽어 모델 클라이언트에 전달합니다.
4. 같은 요청의 초안 작성과 의미 검증은 같은 설정과 키를 사용합니다.
5. 다음 요청은 활성 설정을 새로 조회하므로 모델 변경마다 서버를 재시작하지 않습니다.

모델 설정·활성 상태·실제 API 키는 portfolio-api가 소유합니다. MCP 설정 화면은 실제 API 키를 입력받아 API에 저장 요청만 전달하며 로컬 파일·프로세스 전역 환경에 저장하지 않습니다.
저장·수정·활성화·삭제 응답에는 `apiKey` 대신 `hasApiKey`만 반환합니다. 실제 키는 `RESUME_MODEL_SETTING_TOKEN`으로 보호된 활성 설정 조회와, 인증된 관리 목록(`GET /service/resume-model-setting`, portfolio-api #108)에서만 반환합니다. 관리 목록의 키는 설정별 연결 테스트가 비활성 설정도 호출하기 위한 것이며, MCP 관리 서버가 이 목록을 관리 화면 API로 그대로 전달하므로 관리 세션이 있는 사용자의 브라우저 응답에도 포함됩니다. 화면은 이 값을 사용하거나 표시하지 않습니다.
MCP는 모델 키를 Secret Manager에서 읽지 않으며 모델 호출에 GCP ADC 인증도 필요하지 않습니다.
GitHub 저장소 읽기에 사용하는 Cloud Run bootstrap 인증은 아래처럼 별도로 유지합니다.
정적 파일에는 `RESUME_MODEL_URL`, `RESUME_MODEL_PROVIDER`, `RESUME_MODEL_NAME`, `RESUME_MODEL_TOKEN`을 넣지 않습니다.
API 조회 실패·키 누락이면 모델을 호출하지 않으며 이전 정적 값이나 시크릿 참조로 대체하지 않습니다.
기존 참조명만 저장된 모델은 실제 키가 들어간 새 설정을 등록하고 활성화해야 합니다.
portfolio-api의 migration과 새 API 배포를 먼저 준비한 뒤 MCP를 배포합니다. 실제 키를 응답하는 조회는 캐시하지 않습니다.

## 컨테이너 시작과 운영 배포

이미지에는 체크섬을 확인한 Linux musl CLI 0.2.0과 gh만 포함합니다. 앱 설정 파일과 GitHub 인증은 이미지에 넣지 않습니다.
`start-with-config.sh`가 컨테이너 시작 시 `portfolio-config run`으로 정적 환경을 가져온 뒤 기본 CMD의 Node 서버를 실행합니다.

- `PORTFOLIO_CONFIG_ENVIRONMENT`: 기본값은 production이며 development도 선택할 수 있습니다.
- `PORTFOLIO_CONFIG_REF`: 기본값은 master이며 브랜치나 고정 커밋 SHA를 선택할 수 있습니다.
- `GH_TOKEN`: 비공개 portfolio-config를 읽는 GitHub 인증을 실행 시 전달합니다. CLI 조회 후 Node 프로세스에는 상속하지 않습니다.
- Cloud Run의 PORT와 플랫폼 PORT는 별도로 보존합니다. 정적 설정 조회에 실패하면 서버를 시작하지 않습니다.

Actions는 GCP WIF 인증 후 Secret Manager의 `PORTFOLIO_CONFIG_READ_TOKEN`을 임시 파일로 읽습니다.
이 인증으로 고정 CLI 릴리스만 준비하고, 바이너리 디렉터리를 `configcli` named build context로 이미지에 복사합니다.
앱 환경변수는 Actions에서 조회하거나 나열하지 않습니다. GitHub 인증 파일은 컨텍스트에 포함하지 않고 성공·실패와 관계없이 마지막 단계에서 삭제합니다.
Docker 컨텍스트에서도 `.env*`를 제외합니다.

Cloud Run에는 같은 Secret Manager 항목을 `GH_TOKEN`으로 연결하고 환경·ref만 부트스트랩으로 지정합니다.
GitHub Actions에 별도 `PORTFOLIO_CONFIG_READ_TOKEN` secret을 중복 등록하지 않습니다.
최초에는 기존 GitHub 인증 중 portfolio-config의 Contents 읽기 권한이 있는 것을 이 GCP 항목에 한 번 등록하고 배포 계정과 런타임 계정에 접근 권한을 준비해야 합니다.
토큰을 새로 발급해야 한다는 뜻은 아니며, 로컬 git gh 인증이 Cloud Run으로 자동 공유되지는 않습니다.
운영 부트스트랩 토큰 등록과 해당 시크릿의 계정 접근 권한은 준비했습니다. 새 MCP 이미지의 운영 배포는 master 병합 후 진행됩니다.

로컬 Docker 빌드에는 실행 플랫폼과 맞는 Linux CLI 바이너리를 준비합니다. 디렉터리 안에는 실행 가능한 `portfolio-config` 파일이 있어야 합니다.

```sh
docker build --build-context configcli=/path/to/linux-cli-directory -f mcp/Dockerfile -t portfolio-mcp mcp
docker run --rm --env GH_TOKEN --env PORTFOLIO_CONFIG_ENVIRONMENT=development -p 8080:8080 portfolio-mcp
```

컨테이너의 기본 CMD는 MCP 서버이며 `docker run`에 다른 명령을 지정해도 먼저 정적 설정을 준비합니다.

정적 파일 변경은 새 컨테이너가 시작할 때 적용되며 기존 프로세스에는 자동 반영되지 않습니다.
master를 사용하면 변경 이후 시작한 인스턴스부터 새 설정을 읽습니다.
같은 Cloud Run 리비전의 설정을 동일하게 고정하려면 `PORTFOLIO_CONFIG_REF`에 커밋 SHA를 지정하고 설정 변경 시 새 SHA로 리비전을 갱신합니다. 이때 이미지는 재사용할 수 있습니다.
활성 AI 모델 변경은 기존처럼 다음 도구 요청에서 조회합니다.
