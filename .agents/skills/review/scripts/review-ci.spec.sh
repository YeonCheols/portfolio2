#!/usr/bin/env bash
# review-ci.sh 의 /review 판별과 모델 선택을 검증한다.
set -euo pipefail

dir="$(cd "$(dirname "$0")" && pwd)"
root="$(cd "$dir/../../../.." && pwd)"
# shellcheck source=review-ci.sh
source "$dir/review-ci.sh"

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

check "exact" "$(is_review_command "/review")" "yes"
check "trailing words" "$(is_review_command "/review 부탁드립니다")" "yes"
check "newline" "$(is_review_command $'/review\n추가')" "no"
check "reviewer" "$(is_review_command "/reviewer")" "no"
check "reviews" "$(is_review_command "/reviews")" "no"
check "middle" "$(is_review_command "please /review")" "no"

models=$'Available models\n- composer-2.5\n- composer-2.5-fast\n- claude-opus-5-5-medium'
check "default composer" "$(select_review_model "" "$models")" "composer-2.5"
check "override listed" "$(select_review_model "composer-2.5" "$models")" "composer-2.5"
check "fast only" "$(select_review_model "" $'composer-2.5-fast')" ""
check "override missing" "$(select_review_model "composer-2.5" "claude-opus-5-5-medium")" ""
check "substring" "$(select_review_model "" "not-composer-2.5-extra")" ""
check "empty list" "$(select_review_model "" "")" ""

workflow="$root/.github/workflows/ai-review.yml"
if grep -q "github.event.comment.body == '/review'" "$workflow" \
  && grep -q "startsWith(github.event.comment.body, '/review ')" "$workflow" \
  && ! grep -q "startsWith(github.event.comment.body, '/review')" "$workflow"; then
  echo "ok  workflow gate"
else
  echo "FAIL workflow gate: /review 는 본문 전체이거나 공백 뒤에서만 허용"
  fail=1
fi

exit "$fail"
