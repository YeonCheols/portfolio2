---
name: usage
description: Cursor 플랜 사용량(남은 한도 %)과 GitHub Actions 실행 횟수·과금 시간을 확인해 리포트한다. 사용자가 "사용량", "남은 한도", "한도 몇 %", "리뷰 비용", "usage"를 물을 때 사용한다.
---

# Usage

Cursor 플랜 사용량과 `ai-review` CI(Cursor CLI, `CURSOR_API_KEY`로 같은 플랜에서 과금)의 실행 기록을 함께 확인해 퍼센트 기준으로 보고한다.

## 원칙

- 읽기 전용이다. 설정 변경, 결제, 한도 조정은 하지 않는다
- Cursor 계정에 대신 로그인하지 않는다. 로그인 화면이면 멈추고 사용자에게 로그인을 요청한다
- API 키, 이메일 외 결제 정보(카드 등)는 출력하지 않는다
- 화면에서 읽은 값만 보고하고, 보이지 않는 값은 추정하지 말고 "확인 불가"로 적는다
- 일반 작업이 끝나면 `AGENTS.md`의 토큰 사용 절대로 예산만 `15,000토큰` 형식으로 보고한다. 사용자가 한도를 묻지 않으면 대시보드를 열지 않는다

## 절차

### 1. Cursor 플랜 사용량

1. `cursor-ide-browser`로 `https://cursor.com/dashboard/spending`을 연다 (`browser_tabs` list로 기존 탭이 있으면 재사용)
   - 로그인 페이지로 리다이렉트되면: "Cursor 브라우저 탭에서 로그인해 주세요"라고 요청하고 이 단계를 중단한다 (2단계는 계속 진행)
2. 로딩 스피너가 뜨므로 `browser_take_screenshot`으로 읽는다 (스냅샷에는 % 값이 안 잡힘). 필요하면 아래로 스크롤해 추가로 읽는다
   - 플랜 이름, 월 요금, 갱신/취소 예정일 (`Cancels on ...`이면 반드시 보고)
   - `Included in <플랜>`의 항목별 `N% used`
   - 기타 주간 한도 항목과 리셋 날짜
   - On-demand(초과 사용) 활성 여부
3. 남은 비율 = `100 − 사용률`
4. 보조 정보: `https://cursor.com/dashboard/usage`에서 기간별 토큰 합계와 모델별 사용 내역을 볼 수 있다. 퍼센트는 없다
5. 값이 화면에 안 보이면 "확인 불가"로 적고 추정하지 않는다

### 2. GitHub Actions 실행 기록

```bash
bash .agents/skills/usage/scripts/actions-usage.sh                    # ai-review.yml, 이번 달
bash .agents/skills/usage/scripts/actions-usage.sh ci.yml             # 요청 시
```

- 출력: 실행 횟수, 결과별 횟수, 이벤트별 횟수, 과금 분
- 워크플로가 기본 브랜치에 없으면 "실행 기록 0"으로 보고한다
- 참고로 private Free 플랜의 GitHub Actions 무료 한도는 월 2,000분이다

### 3. 리포트

```markdown
## 사용량 리포트 (YYYY-MM-DD 기준)

### Cursor 플랜

| 항목        | 값                              |
| ----------- | ------------------------------- |
| 플랜        | <플랜명, 갱신 또는 취소 예정일> |
| 항목별 사용 | N% 사용 / (100-N)% 남음         |
| On-demand   | 켜짐/꺼짐                       |

### GitHub Actions (이번 달)

| 항목          | 값                              |
| ------------- | ------------------------------- |
| ai-review.yml | N회 (PR N / `/review` N), N분   |
| 결과          | success N, failure N, skipped N |

### 판단

- 남은 비율이 20% 미만이면 경고하고, ai-review는 `/review` 수동 트리거만 유지할 것을 제안한다
```

## 체크리스트

- [ ] Cursor 대시보드 값을 직접 읽었다 (로그인 필요 시 사용자에게 요청)
- [ ] 퍼센트는 화면 값으로 계산했고 추정치가 없다
- [ ] `actions-usage.sh`로 워크플로 실행 기록을 집계했다
- [ ] 민감 정보(키, 결제 수단)를 출력하지 않았다
