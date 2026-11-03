#!/bin/sh
set -eu

# GitHub 인증은 CLI가 사용하고, 서버에는 정적 설정과 필요한 플랫폼 정보만 전달한다.
exec portfolio-config run \
  --app portfolio-mcp \
  --env "${PORTFOLIO_CONFIG_ENVIRONMENT:-production}" \
  --ref "${PORTFOLIO_CONFIG_REF:-master}" \
  -- env \
  "PORT=${PORT:-8080}" \
  "$@"
