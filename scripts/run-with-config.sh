#!/bin/sh
set -eu

projectRoot=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$projectRoot"
case "${1:-}" in
  development|production) ;;
  *) echo 'INVALID_CONFIG_ENVIRONMENT' >&2; exit 2 ;;
esac

cliTag=$(sh scripts/install-config-cli.sh --latest)
installDir="$projectRoot/.cache/portfolio-config/$cliTag"
if [ ! -x "$installDir/portfolio-config" ]; then
  sh scripts/install-config-cli.sh "$installDir" "$cliTag"
fi
printf 'portfolio-config CLI: %s\n' "$cliTag" >&2
PATH="$installDir:$PATH"
export PATH
exec sh scripts/start-with-config.sh "$@"
