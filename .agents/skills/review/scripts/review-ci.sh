#!/usr/bin/env bash
# ai-review 워크플로가 쓰는 판별 함수.
# is_review_command: 본문이 /review 이거나 "/review "로 시작할 때만 yes.
# 워크플로 if 와 같은 조건이다. /reviewer, /reviews 는 거부한다.
# select_review_model: 목록에 있는 정확한 토큰만 고른다. 없으면 빈 문자열.

is_review_command() {
  local body="$1"
  if [ "$body" = "/review" ]; then
    printf 'yes'
    return 0
  fi
  case "$body" in
    "/review "*) printf 'yes' ;;
    *) printf 'no' ;;
  esac
}

# 토큰 경계: composer-2.5 가 composer-2.5-fast 의 앞부분으로 잡히지 않게 한다
_review_has_token() {
  local token="$1"
  local list="$2"
  [ -n "$token" ] || return 1
  printf '%s\n' "$list" | grep -Eq "(^|[^A-Za-z0-9.-])${token}([^A-Za-z0-9.-]|$)"
}

select_review_model() {
  local override="$1"
  local list="$2"
  if [ -n "$override" ]; then
    if _review_has_token "$override" "$list"; then
      printf '%s' "$override"
    fi
    return 0
  fi
  if _review_has_token "composer-2.5" "$list"; then
    printf '%s' "composer-2.5"
  fi
}
