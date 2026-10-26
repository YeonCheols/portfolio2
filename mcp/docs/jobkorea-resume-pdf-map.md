# 잡코리아 이력서 PDF 대응 기준

## 목표와 책임 경계

- 제공된 잡코리아 이력서 PDF의 시각적 구성과 페이지 흐름을 최종 출력 품질 기준으로 삼습니다.
- 이력서 XML은 사실 정보와 출처의 기준이며, PDF 예시의 내용이나 모양을 근거로 XML에 없는 사실을 채우지 않습니다.
- Codex CLI는 AI 작성 클라이언트로서 선택된 원문에 근거한 문장 초안을 작성합니다.
- `portfolio-resume` MCP는 원소 조회, 선택, 문장 근거 검증, 기존 이슈 #160의 섹션·프로젝트 조립을 담당합니다.
- PDF 렌더러는 검증·조립된 이력서 데이터만 입력으로 받는 출력 경계로 둡니다. MCP 인증·OAuth 게이트웨이와 AI 모델 연결은 PDF 레이아웃을 소유하지 않습니다.
- `generate_resume`가 반환한 결과 JSON을 `convert_resume_to_pdf`에 전달하고, PDF는 MCP tool result의 embedded resource(`mimeType: application/pdf`, base64 `blob`)로 반환합니다. Codex CLI 0.164.0의 로컬 stdio MCP 연동에서 두 도구를 연속 호출해 파일 저장, `%PDF-` 헤더, PDFKit 텍스트 추출, 한글 렌더링을 합성 데이터로 확인했습니다.
- 이 연동 검증은 MCP 클라이언트의 바이너리 전달을 확인한 것이며, 잡코리아 샘플과의 최종 시각 품질 비교나 배포된 MCP 서버에서의 검증은 포함하지 않습니다.

## PDF 구성과 XML 대응

| PDF 영역            | XML 원천                                                                                         | 출력 규칙                                                                                                                                                                                     |
| ------------------- | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 이름·연락처·소개    | `profile`: `name`, `headline`, `email`, `phone`, `gender`, `birthYear`, `reportedAge`, `address` | 프로필 카드로 배치하며 `visibility`와 원문 상태를 보존합니다. 사진은 XML이 `not-extracted`이므로 임의 생성하지 않습니다.                                                                      |
| 요약 카드           | `profile/careerSummary`, `educationHistory`, `employmentHistory`, `activities`, `certifications` | 항목별 XML 값을 요약 표시합니다. 경력 기간과 연차를 현재 날짜 기준으로 재계산하지 않습니다.                                                                                                   |
| 보유 기술           | `technologies/technology`의 `name`, 선택적 `alias`, `category`                                   | 기술 태그로 묶고 XML에 명시된 이름만 표시합니다.                                                                                                                                              |
| 학력                | `educationHistory/education`                                                                     | 학교별 학력, 학과, 기간, 졸업 구분, 학점을 그룹으로 표시합니다.                                                                                                                               |
| 경력                | `employmentHistory/employment`, `projects/project`, `workItems/workItem`, `outcomes/outcome`     | 회사별 프로젝트는 `employmentRef`, 업무 항목은 `projectRef`, 성과는 `workItemRef` 관계를 따라 배치합니다. 상세 역할·기술 구조·프로젝트 내용·진행 방식과 업무·성과를 원문 순서대로 표시합니다. |
| 대외활동·교육·자격  | `activities/activity`, `trainingHistory/training`, `certifications/certification`                | 각 항목을 기간·기관·내용별로 구분합니다. 빈 값이나 누락 값을 추정하지 않습니다.                                                                                                               |
| 자기소개서          | `personalStatements/statement`의 `title`, `text`                                                 | 제목별 본문으로 나누고 원문 줄바꿈을 보존합니다. AI 수정 문장은 `check_resume_draft`의 근거 검사를 통과한 경우에만 사용합니다.                                                                |
| 포트폴리오          | `portfolioReferences/portfolioReference`                                                         | URL과 첨부 이름을 항목별로 분리해 표시합니다.                                                                                                                                                 |
| 병역사항            | `employmentEligibility/militaryService`                                                          | `병역사항`으로 표시합니다. `veteran`, `employmentProtection`, `employmentSubsidy`, `disability`의 미지정 표시는 출력하지 않습니다.                                                            |
| 희망 근무 조건·직무 | `employmentPreferences`: `employmentType`, `regions`, `salary`, `roles`, `industries`            | 근무형태, 지역, 급여, 직무, 산업을 별도 묶음으로 표시합니다.                                                                                                                                  |

## 시각 검증 기준

- PDF 예시의 섹션 순서, 제목 위계, 정보 그룹, 표·카드·태그 표현, 페이지 나눔을 기준으로 비교합니다.
- 같은 회사의 프로젝트와 상세 내용이 서로 섞이지 않아야 합니다.
- 제목·본문·표가 잘리거나 겹치지 않아야 하며, 긴 문장과 항목이 페이지 경계에서 읽기 어렵게 끊기지 않아야 합니다.
- XML에 없는 값, 추정한 사진, 미지정 우대사항을 생성하지 않아야 합니다.
- `visibility`가 `public`인 원문과 해당 원문만 근거로 둔 claim만 출력합니다.
- PDF는 시각적 레이아웃 기준으로만 사용하며, 실제 개인정보를 문서화·테스트 출력·이슈 댓글에 복사하지 않습니다.

## 2026-10-26 로컬 QA 결과

- 실제 저장소 이력서 XML에서 파싱된 모델을 로컬 MCP 연결에 제공하고 `list_resume_elements` → `read_resume_selection` → `generate_resume` → `convert_resume_to_pdf` 순서로 호출했습니다.
- 공개 원문과 프로젝트 참조 85개 업무 항목·7개 성과를 PDF에 반영했으며, 변환 도구가 `application/pdf` 바이너리 리소스를 반환하는 것과 PDFKit으로 9쪽을 렌더링하는 것을 확인했습니다.
- 생성된 모든 페이지를 제공 양식과 대조해 프로필·요약·기술 태그, 학력·회사별 경력·프로젝트, 활동·교육·자격증·자기소개서·포트폴리오·병역·희망근무조건의 배치와 페이지 경계를 확인했습니다.
- 프로필 사진은 XML에서 추출되지 않아 제외했습니다. 상세 프로젝트·업무 항목이 샘플보다 많아 결과는 샘플의 7쪽보다 긴 9쪽입니다. 실제 외부 생성형 모델 대신 선택 원문의 결정적 claim으로 로컬 레이아웃 QA를 수행했으므로 AI 재작성 품질은 검증하지 않았습니다.
- 제공 양식의 작성자 확인 문구와 서비스 고지문은 XML 원천에 없어 생성하지 않았습니다.

## 아직 검증할 경계

- 배포된 MCP 서버에서도 같은 embedded resource 전달이 동작하는지 확인해야 합니다.
- 외부 생성형 모델을 이용한 재작성과 배포된 MCP 서버의 PDF 출력은 별도로 검증해야 합니다.
- PDF 샘플과 XML의 섹션명이 다를 수 있으므로 매핑은 의미 단위로 적용하고, XML 노드 이름을 임의로 바꾸지 않습니다.
