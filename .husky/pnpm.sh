#!/bin/sh

if command -v pnpm >/dev/null 2>&1; then
  exec pnpm "$@"
fi

if command -v corepack >/dev/null 2>&1; then
  exec corepack pnpm "$@"
fi

printf '%s\n' \
  'pnpm을 찾을 수 없습니다. Node.js와 pnpm 실행 환경을 준비해 주세요.' \
  '' \
  '- Corepack 사용: corepack enable' \
  '- pnpm 직접 설치: https://pnpm.io/installation' \
  '- Node.js 25 이상에서 Corepack을 사용하려면 Corepack을 별도로 설치해야 합니다.' \
  '' \
  '환경을 준비한 뒤 저장소 루트에서 의존성을 설치하고 다시 시도해 주세요.' \
  >&2

exit 127
