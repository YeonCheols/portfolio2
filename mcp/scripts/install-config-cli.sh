#!/bin/sh
set -eu

validateTag() {
  case "$1" in
    ''|*[!a-z0-9.-]*) echo 'INVALID_CONFIG_CLI_TAG' >&2; exit 2 ;;
  esac
  if ! printf '%s\n' "$1" | grep -Eq '^cli-v[0-9]+\.[0-9]+\.[0-9]+$'; then
    echo 'INVALID_CONFIG_CLI_TAG' >&2
    exit 2
  fi
}

latestTag() {
  gh api repos/YeonCheols/portfolio-config/releases/latest --jq .tag_name
}

if [ "${1:-}" = '--latest' ]; then
  cliTag=$(latestTag)
  validateTag "$cliTag"
  printf '%s\n' "$cliTag"
  exit 0
fi

installDir=${1:?usage: install-config-cli.sh INSTALL_DIR [CLI_TAG] or --latest}
cliTag=${2:-latest}
if [ "$cliTag" = latest ]; then cliTag=$(latestTag); fi
validateTag "$cliTag"

installer=$(mktemp)
trap 'rm -f -- "$installer"' EXIT HUP INT TERM
gh api "repos/YeonCheols/portfolio-config/contents/scripts/install.sh?ref=$cliTag" \
  --header 'Accept: application/vnd.github.raw+json' > "$installer"
bash "$installer" "$cliTag" "$installDir"
