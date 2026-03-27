# Portfolio2 — Claude 지침

이 프로젝트는 Next.js 기반 포트폴리오 사이트입니다.
현재 **FSD(Feature-Sliced Design)** 아키텍처로 구조 개편 중입니다.

## 핵심 규칙

- 코드 작성 · 이동 · 리뷰 시 FSD 원칙을 적용할 것
- 새 파일은 반드시 FSD 레이어(`shared/`, `features/`, `entities/`, `widgets/`, `pages/`) 에 생성
- `common/`에 새 코드 추가 금지 (마이그레이션 대상)

## 활성 스킬

- **fsd-restructure** — FSD 구조 개편 지침 (코드 배치, 레이어 분류, 마이그레이션 순서)
  위치: `.claude/skills/fsd-restructure/SKILL.md`
