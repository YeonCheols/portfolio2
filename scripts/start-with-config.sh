#!/bin/sh
set -eu

configEnvironment=${1:?usage: start-with-config.sh development|production COMMAND...}
shift
case "$configEnvironment" in
  development|production) ;;
  *) echo 'INVALID_CONFIG_ENVIRONMENT' >&2; exit 2 ;;
esac

# Next.js가 로컬 dotenv의 누락 키를 섞지 않도록 이미 처리된 환경으로 전달한다.
# 이 플래그의 계약은 설치된 @next/env를 사용하는 회귀 테스트로 확인한다.
exec portfolio-config run --app portfolio-web --env "$configEnvironment" --ref master -- \
  env -u GITHUB_NPM_TOKEN "NODE_ENV=$configEnvironment" __NEXT_PROCESSED_ENV=true NEXT_TELEMETRY_DISABLED=1 \
  "PORT=${PORT:-3000}" "HOSTNAME=${HOSTNAME:-0.0.0.0}" "$@"
