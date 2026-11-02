# portfolio-api가 소유하는 MCP 인증

OAuth 인증 흐름과 토큰 수명주기는 portfolio-api가 소유합니다. MCP 도구 요청은 portfolio-api introspection을 사용합니다. AI 모델 관리 화면은 별도 로그인 흐름으로 MCP 서버가 OAuth callback의 authorization code를 portfolio-api에 전달하며, refresh token은 발급받거나 보관하지 않습니다.

```text
MCP client ── OAuth 2.1 + PKCE ──> portfolio-api
    │                                  │ GitHub 로그인 및 사용자 허용 검사
    │                                  │ access/refresh token 발급·회전·폐기
    │                                  └── 토큰 introspection endpoint
    │
    └── Bearer access token ──> 공개 portfolio-mcp
                                    │ 매 요청마다 token introspection
                                    └── MCP 도구 응답
```

## 요청 흐름

1. MCP client가 `MCP_PUBLIC_URL`의 Protected Resource Metadata에서 portfolio-api issuer를 확인합니다.
2. client가 portfolio-api의 OAuth metadata를 조회하고 public OAuth client로 동적 등록한 뒤 authorization code + PKCE S256 흐름으로 로그인합니다.
3. portfolio-api가 GitHub callback을 처리하고 사용자 허용 여부를 확인한 뒤 authorization code를 돌려줍니다.
4. client가 authorization code와 PKCE verifier를 portfolio-api에 제출해 access token과 refresh token을 받습니다.
5. access token이 만료되면 client가 refresh token으로 portfolio-api의 token endpoint를 호출합니다. portfolio-api가 refresh token을 회전하고 새 access/refresh token을 돌려줍니다.
6. client는 각 MCP 요청에 access token을 보냅니다. MCP 서버는 `MCP_AUTH_SERVICE_TOKEN`으로 `POST /auth/introspect`를 호출하고 `active: true`인 경우에만 요청을 처리합니다.

MCP 서버는 token introspection 결과를 캐시하지 않습니다. portfolio-api 요청이 실패하면 MCP 요청은 `503 AUTH_UNAVAILABLE`로 종료되고 인증을 우회하지 않습니다. 비활성 또는 누락된 access token은 `401`로 거부됩니다.

## API 및 런타임 설정

portfolio-api가 제공해야 하는 OAuth protocol endpoint, GitHub callback, JWKS, refresh rotation, revoke, introspection 계약의 소유자는 portfolio-api입니다. MCP가 호출하는 introspection body는 다음과 같습니다.

```json
{ "client_id": "mcp", "token": "<access token>" }
```

MCP 배포는 다음 Actions variables와 Secret Manager secret을 사용합니다.

| 이름                        | 종류                  | 용도                                                                                        |
| --------------------------- | --------------------- | ------------------------------------------------------------------------------------------- |
| `PORTFOLIO_API_URL`         | Actions variable      | portfolio-api origin                                                                        |
| `PORTFOLIO_API_AUTH_ISSUER` | Actions variable      | OAuth issuer. 비우면 `${PORTFOLIO_API_URL}/auth`를 사용                                     |
| `MCP_PUBLIC_URL`            | Actions variable      | MCP resource 전체 URL(`/mcp` 포함)                                                          |
| `MCP_AUTH_SERVICE_TOKEN`    | Cloud Run 환경 변수   | `MCP_AUTH_TOKEN` secret을 이 이름으로 매핑한 portfolio-api introspection 보호용 서비스 토큰 |
| `RESUME_CONNECTION_URL`     | Actions variable      | 기존 이력서 데이터 연결                                                                     |
| `RESUME_CONNECTION_TOKEN`   | Secret Manager secret | 기존 이력서 데이터 연결 인증                                                                |

`MCP_AUTH_SERVICE_TOKEN`은 portfolio-api의 `MCP_AUTH_SERVICE_TOKEN`과 같은 비밀값이어야 합니다. 값 자체는 저장소나 클라이언트 설정에 넣지 않습니다. 배포 런타임 계정에 Secret Manager 접근 권한을 사전에 부여합니다.

배포 workflow는 `portfolio-mcp`를 공개 ingress로 배포합니다. 이 서비스에서 `POST /mcp`는 portfolio-api introspection을 통과해야만 처리됩니다. Cloud Run 도메인이나 사용자 정의 도메인을 바꾸는 경우 `MCP_PUBLIC_URL` 및 MCP client 설정도 함께 갱신합니다.

OAuth 인증서버와 게이트웨이의 소스 및 배포 단계는 제거했습니다. 기존 Cloud Run 서비스는 이 저장소 변경만으로 삭제되지 않으며, 새 MCP 경로의 로그인과 introspection을 검증한 뒤 별도로 정리해야 합니다.

## AI 모델 관리 화면 로그인

AI 모델 관리 화면(`/admin/ai-models`)은 portfolio-api OAuth의 `resume:use` scope를 사용합니다. portfolio-api가 이 scope의 토큰을 허용된 GitHub 계정에만 발급하므로 접근 제한은 scope가 아니라 계정이 맡습니다. 로그인 화면은 GitHub 로그인을 시작하고, portfolio-api가 GitHub 인증 후 운영 DB에 이미 연결된 GitHub identity인지 확인합니다. 이 흐름은 새 MCP 도구를 추가하지 않습니다.

MCP 서버는 동적 OAuth client를 등록하고 authorization code + PKCE를 시작합니다. OAuth state와 verifier는 10분짜리 host-only `HttpOnly`, `Secure`, `SameSite=Lax` 쿠키에 저장합니다. callback에서 state를 검증하고 code를 portfolio-api에 교환한 뒤 access token을 1시간 이내의 `__Host-portfolio-admin-session` 쿠키에 둡니다. refresh token은 요청하지 않고 브라우저 세션은 access token 만료 시 다시 로그인해야 합니다.

모델 관리 요청은 MCP 서버가 Bearer 토큰으로 portfolio-api의 `/mcp/admin/user/auth/check` 및 `/mcp/admin/resume-model-setting` 경로에 전달합니다. portfolio-api는 서명·issuer·audience·DB 세션 상태·`resume:manage` scope와 사용자의 기존 GitHub identity를 검증합니다. 브라우저에서 portfolio-api로 직접 요청하지 않으며 MCP 서버의 same-origin 검사도 유지합니다. 기존 이메일·비밀번호 관리자 로그인은 이 화면에서 사용하지 않습니다.

`MCP_ADMIN_OAUTH_RESOURCE_URL`은 관리 토큰의 audience로 사용하며, 생략하면 `MCP_PUBLIC_URL`을 사용합니다. 이 값은 portfolio-api의 `MCP_RESOURCE_URL`과 정확히 일치해야 합니다.
