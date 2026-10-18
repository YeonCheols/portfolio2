#!/usr/bin/env bash
# GitHub Actions 워크플로 실행 횟수와 과금 시간(분)을 집계한다.
# 사용: bash actions-usage.sh [workflow 파일명] [시작일 YYYY-MM-DD]
#   기본값: ai-review.yml, 이번 달 1일
set -euo pipefail

WORKFLOW="${1:-ai-review.yml}"
SINCE="${2:-$(date +%Y-%m-01)}"
REPO="$(gh repo view --json nameWithOwner --jq .nameWithOwner)"

if ! gh api "repos/$REPO/actions/workflows/$WORKFLOW" --silent 2>/dev/null; then
  echo "workflow: $WORKFLOW 가 기본 브랜치에 없음 (아직 머지 전이면 실행 기록 0)"
  exit 0
fi

runs_json="$(gh run list --repo "$REPO" --workflow "$WORKFLOW" --created ">=$SINCE" \
  --limit 500 --json databaseId,conclusion,event,createdAt)"

count="$(jq 'length' <<<"$runs_json")"
echo "workflow: $WORKFLOW (since $SINCE)"
echo "runs: $count"
if [ "$count" -eq 0 ]; then
  echo "billable_minutes: 0"
  exit 0
fi

echo "by_conclusion:"
jq -r 'group_by(.conclusion) | .[] | "  \(.[0].conclusion // "in_progress"): \(length)"' <<<"$runs_json"
echo "by_event:"
jq -r 'group_by(.event) | .[] | "  \(.[0].event): \(length)"' <<<"$runs_json"

# GitHub는 job마다 분 단위로 올림해 과금하므로 run별로 올림해서 합산한다
total_min=0
while read -r id; do
  ms="$(gh api "repos/$REPO/actions/runs/$id/timing" --jq '.billable.UBUNTU.total_ms // .run_duration_ms // 0')"
  jobs="$(gh api "repos/$REPO/actions/runs/$id/timing" --jq '.billable.UBUNTU.jobs // 1')"
  min=$(( (ms + 59999) / 60000 ))
  [ "$min" -lt "$jobs" ] && min="$jobs"
  total_min=$(( total_min + min ))
done < <(jq -r '.[].databaseId' <<<"$runs_json")

echo "billable_minutes: $total_min"
echo "avg_minutes_per_run: $(( total_min / count ))"
