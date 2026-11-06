# 웹 앱 중앙 설정 실행

로컬과 Cloud Run은 portfolio-config의 `portfolio-web` 설정을 사용합니다. 설정 ref는 `master`이며 로컬은 `development`, 운영 빌드와 운영 서버는 `production`입니다. Vercel은 테스트 용도로 이번 통합에서 제외합니다.

이번 이관은 기본 웹 실행 설정과 `GITHUB_NPM_TOKEN`, `RESUME_CONNECTION_TOKEN`을 대상으로 합니다. 사용자 확인에 따라 당장 사용하지 않는 Gemini·Spotify·블로그·GitHub·WakaTime·모니터링 등의 설정은 이관하지 않습니다. 기존 Vercel 등록값을 전부 옮긴 변경은 아니며, 해당 기능을 다시 사용할 때 필요한 키를 중앙 설정에 등록해야 합니다. Cloud Run 배포 시 기존 개별 설정은 제거되고 중앙에 등록된 값만 적용됩니다.

## 실행

```sh
pnpm dev
pnpm dev:https
pnpm build
pnpm start
```

## Compose 로컬 서버

```sh
pnpm local:up
pnpm local:down
```

`docker-compose.yml`은 Dockerfile의 local 단계를 빌드해 `http://localhost:3001`에서 개발 서버를 실행합니다. 호스트의 IPv4·IPv6 루프백에만 연결하며, `WEB_LOCAL_PORT`로 호스트 포트를 바꿀 수 있습니다. 실행 시 최신 CLI를 조회해 실제 태그를 빌드 인자로 전달하며 컨테이너는 development/master 설정을 받습니다. 설정 원문을 Compose에 넣거나 호스트 `.env`를 마운트하지 않습니다. 소스 변경 반영은 `pnpm local:up`으로 다시 빌드합니다.

패키지 설치는 중앙 development 설정에서 조회한 `GITHUB_NPM_TOKEN`을 BuildKit secret으로 전달합니다. 설정 저장소 인증은 `GH_TOKEN`을 사용하며 CLI가 서버 자식 프로세스에서는 제거합니다. 패키지 토큰도 웹 서버 시작 전에 제거합니다. 호스트의 CLI 캐시·MCP 프로젝트·로컬 인증서는 이미지에서 제외합니다.

실행할 때 GitHub의 최신 정식 CLI 릴리스를 조회합니다. 사용한 실제 태그를 출력하며 `.cache/portfolio-config/<태그>/`에 바이너리를 보관합니다. 같은 버전은 재사용하고 새 릴리스는 별도 경로에 설치합니다. 조회·설치·설정 검증 실패 시 이전 CLI나 로컬 dotenv로 대체하지 않습니다.

프로젝트 `git gh` 인증이 있으면 그 경로를 사용하며, 그 외 환경은 `gh` 인증 또는 기존 `GH_TOKEN`이 필요합니다. 토큰이나 설정 원문을 저장소에 기록하지 않습니다.

CLI의 최소 부모 환경 정책을 유지하고 서버에는 중앙 설정을 전달합니다. 플랫폼의 PORT와 HOSTNAME, 명령별 NODE_ENV를 명시적으로 복원합니다. Next.js가 중앙 설정에 없는 키를 로컬 dotenv에서 추가하지 않도록 `__NEXT_PROCESSED_ENV` 플래그를 전달합니다. 이 내부 계약은 설치된 Next.js의 `@next/env`를 직접 사용하는 회귀 테스트로 보호하므로 Next.js 업그레이드 시 확인해야 합니다.

## Cloud Run

Deploy workflow는 최신 CLI 태그를 한 번 조회한 뒤 같은 버전의 공식 설치 스크립트와 체크섬 검증으로 바이너리를 준비합니다. production 설정을 검증한 뒤 빌드와 서버 시작에서 동일한 `start-with-config.sh` 경로를 사용합니다.

- 패키지 읽기 토큰과 설정 저장소 읽기 토큰은 BuildKit secret으로 전달합니다.
- 패키지 토큰도 중앙 production 설정에서 읽습니다. workflow의 임시 파일은 제한된 권한으로 만들고 종료 시 제거합니다.
- 기존 NEXT_PUBLIC 빌드 인자와 개별 런타임 설정 secret은 중앙 설정으로 대체합니다.
- Cloud Run에는 `GH_TOKEN=PORTFOLIO_CONFIG_READ_TOKEN:latest` 인증만 전달하며 기존 사용자 지정 환경변수는 제거합니다. 플랫폼 PORT는 유지합니다.
- 배포 서비스 계정은 이 secret을 읽을 권한이 필요합니다.
- 설정 변경이 Docker 빌드 캐시에 가려지지 않도록 builder 단계 캐시를 사용하지 않습니다. 의존성 설치 캐시는 유지합니다.
- CLI 실제 버전은 이미지 라벨과 workflow summary에 기록합니다. 이미지 태그는 커밋과 실행 ID를 사용합니다.
- master의 Deploy workflow를 수동 실행하면 코드 변경 없이 최신 CLI로 재배포합니다. 실행 중인 이미지의 CLI를 자동 교체하거나 CLI 릴리스만으로 자동 배포하지 않습니다.

## Vercel 및 CI

`pnpm build:check`와 `pnpm start:check`는 중앙 설정 저장소 인증이 필요 없는 기존 Next.js 명령입니다. Vercel의 buildCommand와 Playwright의 webServer가 이 경로를 사용합니다. Vercel Functions의 런타임 설정은 기존 Vercel 설정을 사용하며 이번 변경으로 중앙 설정을 주입하지 않습니다.

## 검증 기록

- 실행 명령 계약 테스트는 기존 `next dev`에서 실패한 뒤 중앙 실행 경로로 변경해 통과했습니다.
- 배포 계약 테스트는 기존 개별 Secret Manager 설정 전달에서 실패한 뒤 CLI 인증 한 개를 전달하는 경로로 변경해 통과했습니다.
- 가짜 CLI로 development·production 선택, 포트·호스트·공백 인자 보존, 설정 실패 종료 코드와 서버 미실행을 검증했습니다.
- 가짜 GitHub 응답으로 최신 태그 변경 시 설치 경로 갱신과 조회 실패·잘못된 태그 차단을 검증했습니다.
- 최초 실행은 연결 토큰 미설정과 패키지 인증 403으로 차단됐습니다. portfolio-config PR #7에서 Vercel의 패키지 토큰을 웹 양쪽 환경에 복사하고, 연결 토큰을 대응하는 MCP 환경 값으로 갱신했습니다. 값은 출력하지 않았으며 복사한 패키지 토큰의 실제 다운로드 응답은 200으로 확인했습니다.
- 웹 단위 테스트 208 suites/648개, 린트·포맷·타입 검사·actionlint·셸 문법 검사가 통과했습니다. 린트에는 기존 경고 8개가 있습니다. `pnpm build:check`는 통과했으며 GitHub 데이터 수집은 기존 자격 증명 미설정 안내와 함께 빈 결과로 생성했습니다.
- portfolio-config PR #7은 머지됐으며 CLI 0.2.2의 macOS ARM64·Linux musl x86_64/ARM64 릴리스가 완료됐습니다. latest 조회로 받은 0.2.2를 호스트와 컨테이너에서 확인했습니다.
- `WEB_LOCAL_PORT=3002 pnpm local:up`으로 실제 development 컨테이너가 healthy 상태가 됐고 호스트 홈페이지 HTTP 200을 확인했습니다. 이력서 API는 토큰 없는 POST에서 401, 실제 연결 토큰을 사용한 POST에서 200과 정상 이력서 모델 결과를 반환했습니다. 결과 본문과 토큰은 출력하지 않았습니다.
- 실제 컨테이너의 서버 환경에서 development·API 연결 설정을 확인하고 GITHUB_NPM_TOKEN·GH_TOKEN 제외를 확인했습니다. 원격 production 설정도 latest CLI로 주입되는지 별도 프로세스로 확인했습니다.
- 초기 컨테이너에서 pnpm이 실행 사용자 환경에 따라 다른 버전을 내려받는 문제와 Next.js Turbopack/webpack 설정 충돌을 재현했습니다. 개발 컨테이너는 설치된 Next.js를 node로 직접 실행하고 webpack을 명시합니다. 회귀 테스트의 실패와 수정 후 통과를 확인했습니다.
- 커밋 전 운영용 Docker runner 이미지를 실제 production 중앙 설정과 체크섬을 검증한 Linux CLI로 빌드했습니다. 임시 컨테이너에서 NODE_ENV=production·플랫폼 PORT=8080·홈페이지 200·이력서 API 미인증 401/인증 200과 정상 모델 응답 및 설치용 토큰 제외를 확인하고 임시 컨테이너를 종료했습니다.
- 로컬 리뷰에서는 실행기와 배포 설정, Next.js dotenv 경계 및 Vercel·Playwright 분리를 확인했습니다. 실제 Cloud Run 운영 배포와 배포 후 호출은 머지 후 검증 대상입니다.
