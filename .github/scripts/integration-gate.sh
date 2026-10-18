#!/usr/bin/env bash
# Integration 체크 결론을 success/failure/pending으로 정규화한다.

integration_gate_conclusion() {
  case "${1:-}" in
    success)
      printf 'success'
      ;;
    failure | cancelled | timed_out | startup_failure | stale | action_required | neutral | skipped)
      printf 'failure'
      ;;
    *)
      printf 'pending'
      ;;
  esac
}
