#!/usr/bin/env bash
# integration-gate.sh 가 Integration 결론을 정규화하는지 검증한다.
set -euo pipefail

dir="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=integration-gate.sh
source "$dir/integration-gate.sh"

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

check "success" "$(integration_gate_conclusion "success")" "success"
check "failure" "$(integration_gate_conclusion "failure")" "failure"
check "cancelled" "$(integration_gate_conclusion "cancelled")" "failure"
check "empty pending" "$(integration_gate_conclusion "")" "pending"
check "in_progress pending" "$(integration_gate_conclusion "in_progress")" "pending"

exit "$fail"
