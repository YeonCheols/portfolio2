#!/bin/bash
# PostToolUse 훅 — Edit/Write 직후 수정된 파일의 ESLint를 자동 실행
# Claude가 코드를 수정할 때마다 즉시 오류를 피드백받을 수 있도록 합니다.

PROJECT_ROOT="/Users/seong-yeoncheol/Desktop/study/portfolio2"

# stdin에서 tool 호출 JSON 읽기
INPUT=$(cat)

# file_path 추출 (Node.js 사용)
FILE_PATH=$(echo "$INPUT" | node -e "
  let d = '';
  process.stdin.on('data', c => d += c);
  process.stdin.on('end', () => {
    try {
      const json = JSON.parse(d);
      process.stdout.write(json.tool_input?.file_path || '');
    } catch (e) {
      process.stdout.write('');
    }
  });
" 2>/dev/null)

# 파일 경로가 없으면 종료
[ -z "$FILE_PATH" ] && exit 0

# .ts / .tsx 파일이 아니면 종료
[[ ! "$FILE_PATH" =~ \.(ts|tsx)$ ]] && exit 0

# src/ 디렉터리 외부 파일은 건너뜀
[[ ! "$FILE_PATH" =~ "$PROJECT_ROOT/src/" ]] && exit 0

cd "$PROJECT_ROOT" || exit 0

# ESLint 실행 (stderr 제거 — pnpm의 .npmrc WARN 등 노이즈 차단)
ESLINT_OUTPUT=$(pnpm exec eslint "$FILE_PATH" --format=compact 2>/dev/null) || true

# 오류/경고가 없으면 조용히 종료
if [ -z "$ESLINT_OUTPUT" ] || echo "$ESLINT_OUTPUT" | grep -q "0 problems"; then
  exit 0
fi

# 실제 ESLint 문제가 있을 때만 출력
echo ""
echo "┌─ ESLint ($(basename "$FILE_PATH")) ──────────────────"
echo "$ESLINT_OUTPUT"
echo "└────────────────────────────────────────────────────"
