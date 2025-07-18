module.exports = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    // 타입 검증
    "type-enum": [
      2,
      "always",
      [
        "feat", // 새로운 기능
        "fix", // 버그 수정
        "docs", // 문서 수정
        "style", // 코드 포맷팅, 세미콜론 누락, 코드 변경이 없는 경우
        "refactor", // 코드 리팩토링
        "perf", // 성능 개선
        "test", // 테스트 추가, 테스트 리팩토링
        "build", // 빌드 시스템 또는 외부 종속성에 영향을 주는 변경사항
        "ci", // CI 설정 파일 및 스크립트 변경
        "chore", // 기타 변경사항
        "revert", // 이전 커밋 되돌리기
      ],
    ],
    // 타입은 소문자만 허용
    "type-case": [2, "always", "lower-case"],
    // 타입은 비어있으면 안됨
    "type-empty": [2, "never"],
    // 제목은 비어있으면 안됨
    "subject-empty": [2, "never"],
    // 제목은 소문자로 시작해야 함
    "subject-case": [2, "always", "lower-case"],
    // 제목은 마침표로 끝나면 안됨
    "subject-full-stop": [2, "never", "."],
    // 제목 최대 길이 (50자)
    "subject-max-length": [2, "always", 50],
    // 본문은 선택사항이지만 있으면 줄바꿈으로 시작해야 함
    "body-leading-blank": [2, "always"],
    // 본문 최대 길이 (72자)
    "body-max-line-length": [2, "always", 72],
    // 푸터는 선택사항이지만 있으면 줄바꿈으로 시작해야 함
    "footer-leading-blank": [2, "always"],
    // 푸터 최대 길이 (72자)
    "footer-max-line-length": [2, "always", 72],
  },
};
