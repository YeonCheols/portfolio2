#!/bin/sh
set -eu

projectRoot=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$projectRoot"
case "${1:-}" in
  up)
    if [ -z "${GH_TOKEN:-}" ]; then
      if git config --local --get alias.gh >/dev/null 2>&1; then
        GH_TOKEN=$(git gh auth token --hostname github.com)
      else
        GH_TOKEN=$(gh auth token --hostname github.com)
      fi
    fi
    export GH_TOKEN
    PORTFOLIO_CONFIG_CLI_TAG=$(sh scripts/install-config-cli.sh --latest)
    installDir="$projectRoot/.cache/portfolio-config/$PORTFOLIO_CONFIG_CLI_TAG"
    if [ ! -x "$installDir/portfolio-config" ]; then
      sh scripts/install-config-cli.sh "$installDir" "$PORTFOLIO_CONFIG_CLI_TAG"
    fi
    GITHUB_NPM_TOKEN=$("$installDir/portfolio-config" run --app portfolio-web --env development --ref master -- \
      sh -c 'test -n "$GITHUB_NPM_TOKEN" || exit 2; printf "%s" "$GITHUB_NPM_TOKEN"')
    export GITHUB_NPM_TOKEN PORTFOLIO_CONFIG_CLI_TAG
    exec docker compose --project-directory "$projectRoot" -f docker-compose.yml up --build --detach --wait --wait-timeout 180 server
    ;;
  down)
    # 서비스 제거에는 CLI 조회와 저장소 인증이 필요하지 않다.
    PORTFOLIO_CONFIG_CLI_TAG=unused
    export PORTFOLIO_CONFIG_CLI_TAG
    exec docker compose --project-directory "$projectRoot" -f docker-compose.yml down
    ;;
  *) echo 'Usage: compose.sh up|down' >&2; exit 2 ;;
esac
