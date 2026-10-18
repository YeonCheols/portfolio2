#!/usr/bin/env bash
# 최신 리뷰 본문에 🔴가 있으면 failure, 없으면 success를 출력한다.

review_gate_conclusion() {
  local body="$1"
  if printf '%s\n' "$body" | grep -q "🔴"; then
    printf 'failure'
    return 0
  fi
  printf 'success'
}
