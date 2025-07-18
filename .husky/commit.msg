#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# 커스텀 커밋 메시지 검증 스크립트 실행
node scripts/validate-commit.js "$1"
