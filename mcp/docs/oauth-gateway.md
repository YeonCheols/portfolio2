# MCP OAuth 게이트웨이

`portfolio-mcp-oauth-gateway`는 기존 Auth0 OAuth 발급자를 사용해 클라이언트 access token을 확인하는 MCP 진입점입니다. 게이트웨이는 OAuth 보호 리소스이며 토큰을 발급하거나 사용자를 로그인시키지 않습니다. 검증한 요청만 비공개 `portfolio-mcp`에 전달하고, Cloud Run ID token은 `X-Serverless-Authorization`에, 기존 MCP 내부 bearer token은 `Authorization`에 전달합니다. Cursor는 연결을 확인할 클라이언트 중 하나이며 인증 흐름은 특정 클라이언트에 종속되지 않습니다.

```text
MCP client ── Auth0 access token ──> portfolio-mcp-oauth-gateway
                                          │ 서명·issuer·audience·scope 확인
                                          └── Cloud Run ID token + 내부 MCP token ──> 비공개 portfolio-mcp
```

## Auth0 설정

1. Auth0 API를 만들고 Identifier를 GitHub Actions의 `MCP_PUBLIC_URL` 값과 똑같이 설정합니다. 값은 공개 게이트웨이의 전체 `/mcp` URL입니다.
2. API에 `resume:use` permission을 추가합니다.
3. 클라이언트의 OAuth `resource` 값이 API audience로 사용되도록 기존 Auth0 Resource Parameter Compatibility Profile 설정을 유지합니다.
4. 클라이언트가 보내는 access token은 Auth0 issuer가 발급하고, API audience가 `MCP_PUBLIC_URL`이며, `resume:use` scope를 가져야 합니다.
5. `AUTH0_ISSUER`에는 토큰의 `iss` claim과 정확히 같은 테넌트 issuer URL을 입력합니다. 예: `https://example.us.auth0.com/`.

클라이언트는 MCP OAuth protected-resource metadata에서 Auth0 issuer와 필요한 scope를 찾고, 해당 issuer의 OAuth discovery 및 로그인을 처리합니다. Auth0는 발급자로 유지되며 MCP 게이트웨이는 JWT 서명, issuer, audience, 만료 시각, scope를 검증합니다. 클라이언트 access token은 내부 MCP로 전달하지 않습니다.

## GitHub Actions 변수와 권한

다음 Actions repository variables가 필요합니다.

| 변수                                      | 값                                                             |
| ----------------------------------------- | -------------------------------------------------------------- |
| `AUTH0_ISSUER`                            | Auth0 issuer URL (`/` 포함 여부까지 `iss`와 일치)              |
| `MCP_PUBLIC_URL`                          | 공개 게이트웨이의 전체 `/mcp` URL; Auth0 API Identifier와 동일 |
| `MCP_BACKEND_URL`                         | 기존 비공개 MCP의 전체 `/mcp` URL                              |
| `GCP_MCP_GATEWAY_RUNTIME_SERVICE_ACCOUNT` | 게이트웨이 전용 Cloud Run 런타임 서비스 계정                   |

`MCP_AUTH_TOKEN`은 기존 Secret Manager secret을 게이트웨이에서도 참조합니다. 배포 workflow는 게이트웨이 런타임 서비스 계정에 해당 secret의 `secretAccessor`와 `portfolio-mcp`의 `roles/run.invoker`를 부여합니다. Actions 배포 서비스 계정에는 런타임 계정으로 배포하기 위한 `iam.serviceAccountUser`, 서비스 IAM 정책 수정 권한, Secret Manager IAM 정책 수정 권한이 필요합니다.

게이트웨이 Cloud Run 서비스는 공개 ingress로 배포되지만 MCP 요청은 Auth0 bearer token을 검증합니다. 기존 `portfolio-mcp`는 계속 `--no-allow-unauthenticated`로 배포됩니다. OAuth provider 값이나 token 값은 클라이언트 설정 파일이나 저장소에 기록하지 않습니다.

## 배포 및 클라이언트 연결

`MCP_PUBLIC_URL`은 게이트웨이의 실제 공개 URL과 일치해야 하므로 Actions variable에 Cloud Run 서비스 주소를 `/mcp`까지 포함해 등록합니다. 게이트웨이는 `Host`와 `X-Forwarded-*` 값으로 OAuth 리소스 주소를 만들지 않습니다. 이 고정 URL은 protected-resource metadata의 `resource`, 401 discovery challenge, access token audience 검증에서 공통으로 사용합니다.

배포 후 표준 MCP OAuth를 지원하는 클라이언트에 `MCP_PUBLIC_URL`을 등록하고 OAuth 로그인을 완료합니다. 각 클라이언트의 OAuth discovery, PKCE, client registration 지원 범위는 별도로 확인합니다.

## 참고 아키텍처

공식 GitHub MCP 서버의 `cmd/`, `pkg/`, `docs/` 분리를 참고해 이 저장소도 MCP 앱 설정과 문서, 소스 책임을 `mcp/` 아래에 모읍니다. 실행 코드는 `mcp/src/`, 재사용 가능한 이력서 로직은 `mcp/src/resume/`, OAuth 게이트웨이는 `mcp/src/gateway/`에 둡니다. 이 디렉터리를 별도 저장소로 옮길 때 웹 앱과 설정이 섞이지 않도록 경계를 유지합니다.
