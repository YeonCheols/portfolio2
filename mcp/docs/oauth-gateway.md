# MCP OAuth 인증과 배포

이 저장소는 MCP 인증서버, 공개 OAuth 게이트웨이, 비공개 MCP 서버를 각각 독립된 Cloud Run 서비스로 배포합니다. 세 서비스의 소스·컨테이너·설정·문서는 `mcp/` 아래에 함께 둡니다. MCP를 별도 저장소로 분리할 때는 인증서버와 게이트웨이도 MCP 서버와 함께 옮깁니다.

```text
MCP client ── OAuth 2.1 + PKCE ──> portfolio-mcp-oauth-auth
    │                                  │ GitHub OAuth App 로그인
    │                                  │ GitHub 숫자 ID 허용목록 확인
    │                                  └── RS256 MCP access token
    │
    └── Bearer access token ──> portfolio-mcp-oauth-gateway
                                    │ issuer·audience·scope·서명 검증(JWKS)
                                    └── Cloud Run ID token + 내부 MCP token ──> 비공개 portfolio-mcp
```

인증서버는 GitHub access token을 서버 내부에서 사용자 확인에만 사용하고, MCP client나 게이트웨이에 전달하거나 저장하지 않습니다. 허용된 GitHub 사용자만 `resume:use` scope의 MCP access token을 받습니다. 사용자 DB, 관리 UI, refresh token은 현재 범위에 포함하지 않습니다.

## OAuth 흐름

1. MCP client가 게이트웨이의 Protected Resource Metadata에서 인증서버 issuer를 찾습니다.
2. client가 `/.well-known/oauth-authorization-server`를 조회한 뒤 공개 client를 `/register`에 등록합니다. authorization code flow와 PKCE S256을 사용합니다.
3. `/authorize`가 client ID, 등록된 redirect URI, PKCE challenge, `resource=MCP_PUBLIC_URL`, `scope=resume:use`를 검증하고 GitHub App 로그인으로 보냅니다.
4. `/github/callback`이 GitHub code를 서버 측에서 교환하고 GitHub `/user`의 숫자 ID를 허용목록과 비교합니다. 허용된 경우에만 client redirect URI로 짧은 수명의 authorization code를 돌려보냅니다.
5. client가 PKCE verifier를 `/token`에 제출하면 인증서버가 MCP resource용 RS256 access token을 발급합니다.
6. 게이트웨이는 인증서버 JWKS의 키로 토큰 서명, issuer, audience, 만료 및 scope를 검증합니다. 통과한 요청만 비공개 `portfolio-mcp`로 전달합니다.

메타데이터 경로는 `/.well-known/oauth-authorization-server`, 공개 키는 `/.well-known/jwks.json`, 헬스체크는 `/health`입니다. 게이트웨이는 `/.well-known/oauth-protected-resource/mcp`에 보호 리소스 metadata를 제공합니다.

## CLI 클라이언트 지원 범위

CLI client는 브라우저에서 GitHub 로그인을 진행하고 `http://127.0.0.1:<port>/callback` 또는 `http://localhost:<port>/callback` loopback URI로 돌아오는 authorization code + PKCE 흐름을 사용할 수 있습니다. 동적 등록은 `authorization_code` grant와 `code` response type을 지원하고, MCP access token은 1시간 유효합니다.

현재 인증서버는 refresh token을 발급하지 않습니다. refresh token의 회전·폐기 상태를 인스턴스 재시작과 scale-to-zero 이후에도 보존할 영속 저장소가 초기 범위에 없기 때문입니다. 만료된 access token을 갱신하려면 CLI가 새 브라우저 로그인을 시작해야 합니다. 기존 `nb-front` Page AST CLI 구현은 refresh token을 필수로 다루고 인증 metadata endpoint가 MCP resource와 같은 origin인지 검사하므로, 별도 Cloud Run issuer를 사용하는 이 서비스와 직접 호환된다고 가정하지 않습니다.

## GitHub App 설정

GitHub App `Portfolio MCP Auth`를 OAuth 로그인에 사용합니다. App의 **Callback URL**은 인증서버를 첫 배포한 뒤 실제 Cloud Run 주소로 설정합니다.

```text
https://<portfolio-mcp-oauth-auth의 Cloud Run URL>/github/callback
```

GitHub App의 Client ID는 Actions repository variable `MCP_GITHUB_OAUTH_CLIENT_ID`에 등록합니다. `GITHUB_` 접두사는 GitHub Actions에서 예약되어 변수 이름으로 사용할 수 없습니다. Client secret은 Secret Manager의 `GITHUB_OAUTH_CLIENT_SECRET`에 두며, 저장소 변수나 클라이언트 설정에 넣지 않습니다. App의 홈페이지 주소는 GitHub 사용자 로그인용이 아니므로 callback으로 사용하지 않습니다.

## 배포 설정

GitHub Actions repository variables:

| 변수                                                           | 용도                                                              |
| -------------------------------------------------------------- | ----------------------------------------------------------------- |
| `GCP_PROJECT_ID`, `GCP_REGION`                                 | GCP 프로젝트와 리전                                               |
| `GCP_WORKLOAD_IDENTITY_PROVIDER`, `GCP_DEPLOY_SERVICE_ACCOUNT` | 기존 배포 WIF 설정                                                |
| `GCP_MCP_GATEWAY_RUNTIME_SERVICE_ACCOUNT`                      | 게이트웨이 전용 런타임 서비스 계정                                |
| `GCP_MCP_AUTH_RUNTIME_SERVICE_ACCOUNT`                         | 인증서버 전용 런타임 서비스 계정                                  |
| `MCP_GITHUB_OAUTH_CLIENT_ID`                                   | GitHub App Client ID                                              |
| `MCP_AUTHORIZED_GITHUB_USER_IDS`                               | 허용할 GitHub 숫자 ID 목록. 현재 `91575756`                       |
| `MCP_PUBLIC_URL`                                               | 공개 게이트웨이의 전체 `/mcp` URL이며 access token audience입니다 |
| `MCP_BACKEND_URL`                                              | 비공개 MCP 서비스의 전체 `/mcp` URL                               |
| `RESUME_CONNECTION_URL`                                        | MCP 서버의 기존 이력서 연결 URL                                   |

Secret Manager secrets:

| Secret                          | 접근 주체              | 용도                                           |
| ------------------------------- | ---------------------- | ---------------------------------------------- |
| `GITHUB_OAUTH_CLIENT_SECRET`    | 인증서버 런타임 계정   | GitHub OAuth code 교환                         |
| `MCP_OAUTH_SIGNING_PRIVATE_KEY` | 인증서버 런타임 계정   | MCP access token 서명용 PKCS#8 RSA private key |
| `MCP_AUTH_TOKEN`                | 게이트웨이 런타임 계정 | 기존 MCP 내부 bearer token                     |
| `RESUME_CONNECTION_TOKEN`       | 기존 MCP 런타임 계정   | 기존 이력서 연결 기능                          |

인증서버 전용 서비스 계정은 위 두 인증서버 secret만 읽습니다. 게이트웨이 전용 서비스 계정은 `MCP_AUTH_TOKEN`과 비공개 MCP 호출 권한만 갖습니다. 두 계정을 하나로 합치지 않습니다. 런타임 계정의 Secret IAM 바인딩은 GCP에서 사전 설정하며, 반복 배포 권한에는 Secret IAM 정책 변경 권한을 포함하지 않습니다. Cloud Run 인증서버와 게이트웨이는 공개 OAuth 요청을 받아야 하므로 unauthenticated ingress로 배포하며, 실제 MCP 서비스는 비공개로 유지합니다.

웹 배포 workflow와 MCP 배포 workflow는 별도 파일로 관리합니다. `.github/workflows/deploy.yml`은 웹 서버만 배포하고 `mcp/**` 변경만으로는 실행되지 않습니다. `.github/workflows/deploy-mcp.yml`은 `mcp/**` 변경에 반응해 비공개 MCP 서버, OAuth 인증서버, OAuth 게이트웨이를 배포합니다. MCP workflow는 인증서버의 Cloud Run canonical service URL을 조회해 `MCP_AUTH_ISSUER`로 설정하고, 그 값을 게이트웨이에 전달합니다. 배포 서비스 계정에는 인증서버와 게이트웨이 런타임 계정별 `iam.serviceAccountUser` 및 Cloud Run 배포 권한이 필요합니다. GitHub App callback URL은 첫 배포 후 실제 인증서버 URL의 `/github/callback`으로 등록해야 GitHub 로그인이 완료됩니다.

## 초기 버전의 상태 보관과 제한

공개 client ID는 서명키에서 파생한 서명으로 자체 검증하므로 사용자/client DB 없이 유지됩니다. OAuth state와 authorization code는 인증서버 프로세스 메모리에만 저장되고 각각 10분, 1분 후 만료됩니다. Cloud Run은 인증서버를 최대 인스턴스 1개로 제한합니다. 프로세스 재시작 또는 scale-to-zero 후 진행 중 로그인은 다시 시작해야 합니다. 이 제한을 없애거나 여러 인스턴스로 확장할 때는 state와 일회용 authorization code를 공유할 짧은 수명 저장소가 필요합니다.

서명키를 교체하면 기존 client ID가 다시 등록되어야 하고, 현재 JWKS에 예전 공개 키를 함께 제공하지 않으므로 기존 access token도 더는 검증되지 않습니다. 키 교체는 계획된 재인증 시점에 진행합니다.

## MCP 프로젝트 분리 기준

MCP를 별도 프로젝트로 옮길 때 `mcp/` 전체를 이동합니다. 인증서버(`src/auth/`, `Dockerfile.auth`, `start:auth`), 공개 게이트웨이(`src/gateway/`, `Dockerfile.gateway`), 비공개 MCP 서버, OAuth 문서, MCP `package.json`·lockfile·TypeScript 설정과 배포 workflow 연동을 함께 이동해야 합니다. 인증서버는 MCP access token 발급자이고 게이트웨이는 그 토큰의 소비자이므로 두 책임은 배포 서비스로 분리하되 한 MCP 프로젝트 경계에 둡니다.
