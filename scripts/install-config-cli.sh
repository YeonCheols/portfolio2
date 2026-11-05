#!/bin/sh
set -eu

github() {
  if git config --local --get alias.gh >/dev/null 2>&1; then
    git gh "$@"
  else
    gh "$@"
  fi
}

validateTag() {
  case "$1" in
    ''|*[!a-z0-9.-]*) echo 'INVALID_CONFIG_CLI_TAG' >&2; exit 2 ;;
  esac
  if ! printf '%s\n' "$1" | grep -Eq '^cli-v[0-9]+\.[0-9]+\.[0-9]+$'; then
    echo 'INVALID_CONFIG_CLI_TAG' >&2
    exit 2
  fi
}

if [ "${1:-}" = --latest ]; then
  cliTag=$(github api repos/YeonCheols/portfolio-config/releases/latest --jq .tag_name)
  validateTag "$cliTag"
  printf '%s\n' "$cliTag"
  exit 0
fi

installDir=${1:?usage: install-config-cli.sh INSTALL_DIR CLI_TAG or --latest}
cliTag=${2:?CLI_TAG is required}
validateTag "$cliTag"
installer=$(mktemp)
trap 'rm -f -- "$installer"' EXIT HUP INT TERM
github api "repos/YeonCheols/portfolio-config/contents/scripts/install.sh?ref=$cliTag" \
  --header 'Accept: application/vnd.github.raw+json' > "$installer"
bash "$installer" "$cliTag" "$installDir"
