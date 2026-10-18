#!/usr/bin/env bash
# review-gate.sh 가 🔴 차단 항목을 failure로 판정하는지 검증한다.
set -euo pipefail

dir="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=review-gate.sh
source "$dir/review-gate.sh"

fail=0
check() {
  local name="$1" got="$2" want="$3"
  if [ "$got" = "$want" ]; then
    echo "ok  $name"
  else
    echo "FAIL $name: got [$got] want [$want]"
    fail=1
  fi
}

check "empty" "$(review_gate_conclusion "")" "success"
check "clean" "$(review_gate_conclusion "## 코드 리뷰: ✅ 문제 없음")" "success"
check "blocking" "$(review_gate_conclusion "- 🔴 \`a.ts:1\` — 실패합니다.")" "failure"
check "suggestion only" "$(review_gate_conclusion "- 🟡 권장합니다.")" "success"

exit "$fail"
