---
description: git diff를 분석하여 Conventional Commits 규칙에 맞는 커밋 메시지를 자동 생성하고 커밋합니다.
---

# Auto Commit — Conventional Commits

`git diff`(staged/unstaged)와 `git status`를 분석하여 이 프로젝트의 Conventional Commits 규칙에 맞는 커밋 메시지를 자동으로 생성하고 커밋합니다.

## 실행 절차

1. **상태 파악** — 아래 명령을 병렬로 실행
   - `git status` — 변경된 파일 목록 확인
   - `git diff` — unstaged 변경사항 확인
   - `git diff --staged` — staged 변경사항 확인
   - `git log --oneline -5` — 최근 커밋 스타일 참고

2. **스테이징** — 아직 staged되지 않은 파일이 있으면 관련 파일을 `git add <file>...`로 추가 (`.env`, 시크릿 파일 제외)

3. **커밋 메시지 생성** — 변경사항을 분석하여 아래 규칙에 따라 메시지 작성

4. **커밋 실행** — `git commit -m "..."` 으로 커밋

5. **결과 확인** — `git status`로 커밋 성공 여부 확인

---

## Conventional Commits 규칙

### 형식
```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### 타입 선택 기준

| 타입 | 언제 사용 |
|------|-----------|
| `feat` | 새로운 기능, 새 파일, 새 컴포넌트 추가 |
| `fix` | 버그 수정, 오류 해결 |
| `docs` | 문서, README, 주석 수정 |
| `style` | 코드 포맷팅, 세미콜론 등 (로직 변경 없음) |
| `refactor` | 기능 변경 없이 코드 구조 개선 |
| `build` | 빌드 설정, 패키지 의존성 변경 |
| `ci` | CI/CD 설정 변경 |
| `chore` | 기타 (설정 파일, 스크립트 등) |
| `revert` | 이전 커밋 되돌리기 |

### 스코프 (선택)
변경된 모듈/기능 영역을 명시합니다.
- 예: `feat(auth)`, `fix(ui)`, `refactor(blog)`
- FSD 레이어 기반: `shared`, `features`, `entities`, `pages` 등

### 설명 작성 규칙
- **한국어** 사용 (이 프로젝트 컨벤션)
- **제목 전체**(`type(scope): description`) 기준 **50자 이하** — pre-commit hook이 검사하므로 반드시 준수
- **description은 소문자로 시작** — 영문·한국어 혼용 시 첫 단어가 대문자 약어(FSD, API 등)면 소문자로 변환 (e.g. `fsd`, `api`)
- 마침표 금지
- 명령형·현재 시제

### 여러 타입이 섞인 경우
가장 중요한 변경을 기준으로 타입을 결정하고, body에 나머지 변경 사항을 나열합니다.

---

## 주의사항

- `.env`, `*.key`, `*.pem` 등 시크릿 파일은 절대 커밋하지 않습니다
- 커밋 전 반드시 변경 내용을 사용자에게 보여주고 확인을 받습니다
- pre-commit hook이 실패하면 원인을 분석하고 수정한 뒤 새 커밋을 생성합니다 (amend 사용 금지)
