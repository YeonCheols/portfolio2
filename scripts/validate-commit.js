#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

// 커밋 메시지 파일 경로 (git hook에서 전달받은 인자)
const commitMsgFile = process.argv[2];

if (!commitMsgFile) {
  console.error("❌ 커밋 메시지 파일 경로가 제공되지 않았습니다.");
  process.exit(1);
}

// 커밋 메시지 읽기
const commitMsg = fs.readFileSync(commitMsgFile, "utf8").trim();

// 커밋 메시지 구조 분석
const lines = commitMsg.split("\n");
const firstLine = lines[0];

// 기본 패턴 검증
const conventionalCommitPattern =
  /^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\(.+\))?: .+/;

if (!conventionalCommitPattern.test(firstLine)) {
  console.error(
    "❌ 커밋 메시지가 Conventional Commits 형식을 따르지 않습니다.",
  );
  console.error("");
  console.error("올바른 형식:");
  console.error("  feat: 새로운 기능 추가");
  console.error("  fix: 버그 수정");
  console.error("  docs: 문서 수정");
  console.error("  style: 코드 포맷팅");
  console.error("  refactor: 코드 리팩토링");
  console.error("  perf: 성능 개선");
  console.error("  test: 테스트 추가");
  console.error("  build: 빌드 시스템 변경");
  console.error("  ci: CI 설정 변경");
  console.error("  chore: 기타 변경사항");
  console.error("  revert: 이전 커밋 되돌리기");
  console.error("");
  console.error("예시:");
  console.error("  feat(auth): 로그인 기능 추가");
  console.error("  fix(ui): 버튼 스타일 수정");
  console.error("  docs: README 업데이트");
  process.exit(1);
}

// 제목 길이 검증 (50자 제한)
if (firstLine.length > 50) {
  console.error("❌ 커밋 제목이 50자를 초과합니다.");
  console.error(`현재 길이: ${firstLine.length}자`);
  console.error(`제목: ${firstLine}`);
  process.exit(1);
}

// 제목이 마침표로 끝나는지 검증
if (firstLine.endsWith(".")) {
  console.error("❌ 커밋 제목은 마침표로 끝나면 안됩니다.");
  console.error(`제목: ${firstLine}`);
  process.exit(1);
}

// 제목이 소문자로 시작하는지 검증
const subject = firstLine.split(": ")[1];
if (subject && subject[0] !== subject[0].toLowerCase()) {
  console.error("❌ 커밋 제목은 소문자로 시작해야 합니다.");
  console.error(`제목: ${firstLine}`);
  process.exit(1);
}

// 본문 검증 (있는 경우)
if (lines.length > 1) {
  const body = lines.slice(1).join("\n");
  const bodyLines = body.split("\n");

  // 본문의 각 줄이 72자를 초과하지 않는지 검증
  for (let i = 0; i < bodyLines.length; i++) {
    const line = bodyLines[i];
    if (line.length > 72) {
      console.error(`❌ 본문 ${i + 1}번째 줄이 72자를 초과합니다.`);
      console.error(`현재 길이: ${line.length}자`);
      console.error(`내용: ${line}`);
      process.exit(1);
    }
  }
}

console.log("✅ 커밋 메시지가 Conventional Commits 형식을 따릅니다.");
process.exit(0);
