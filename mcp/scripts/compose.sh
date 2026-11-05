#!/bin/sh
set -eu

mcpRoot=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
case "${1:-}" in
  up)
    # 호스트의 프로젝트 인증을 사용하고 토큰을 파일이나 인자에 남기지 않는다.
    if [ -z "${GH_TOKEN:-}" ]; then
      if git -C "$mcpRoot" config --local --get alias.gh >/dev/null 2>&1; then
        GH_TOKEN=$(git -C "$mcpRoot" gh auth token --hostname github.com)
      else
        GH_TOKEN=$(gh auth token --hostname github.com)
      fi
    fi
    export GH_TOKEN
    PORTFOLIO_CONFIG_CLI_TAG=$(sh "$mcpRoot/scripts/install-config-cli.sh" --latest)
    export PORTFOLIO_CONFIG_CLI_TAG
    exec docker compose --project-directory "$mcpRoot" -f "$mcpRoot/docker-compose.yml" up --build --detach --wait --wait-timeout 120 server
    ;;
  down)
    exec docker compose --project-directory "$mcpRoot" -f "$mcpRoot/docker-compose.yml" --profile local down
    ;;
  verify)
    exec docker compose --project-directory "$mcpRoot" -f "$mcpRoot/docker-compose.yml" run --build --rm verify
    ;;
  *)
    echo 'Usage: compose.sh up|down|verify' >&2
    exit 2
    ;;
esac
