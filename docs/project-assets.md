# 프로젝트 소개 이미지

PROJECT.md 본문에서 사용하는 이미지는 public/project에 보관합니다. 공개 저장소에서 이미지가 추가된 커밋의 원본 URL로 연결합니다. PR 검토 중에도 이미지가 보이고, 이후 파일이 바뀌어도 본문에서 참조하는 이미지가 유지됩니다. 이미지를 갱신하면 새 커밋의 공개 URL로 본문도 함께 갱신합니다.

- home.png, projects.png, project-detail.png, featured-project.png, tags.png, about-career.png, learn.png, playground.png, guestbook.png: 2026-11-21에 배포 사이트 https://www.ycseng.com 의 공개 화면을 Playwright(1440×900)로 캡처한 실제 화면입니다. 로그인이 필요 없는 페이지만 사용했고 입력·저장 작업은 하지 않았습니다. project-detail.png는 `/projects/portfolio-admin`, featured-project.png는 `/projects/albamon-msa`입니다.
- command-palette.png: 같은 사이트에서 ⌘K로 검색 팔레트를 연 상태를 캡처했습니다.
- ai-chat.png: 같은 사이트에서 챗봇 패널만 열고 질문은 보내지 않은 상태를 캡처했습니다.
- architecture.svg: 방문자·웹·외부 API의 연결 구조를 설명하는 도식 원본입니다. 실제 화면 캡처가 아닙니다.
- architecture.png: 위 SVG를 Playwright로 렌더링한 본문용 이미지입니다.

공개 이미지에는 토큰·쿠키·계정 이메일·브라우저 북마크나 다른 작업 탭을 넣지 않습니다. 내용이 바뀌면 해당 화면을 다시 캡처하고 문서 설명과 함께 확인합니다. 대표 썸네일은 루트 PROJECT.png를 사용하며 배포 사이트 첫 화면(home.png)과 같은 이미지입니다. image 메타데이터에서 이 파일의 공개 커밋 URL을 지정합니다.

대시보드와 블로그 화면은 외부 데이터 연동이 비어 있어 캡처하지 않았고 본문에서도 다루지 않습니다. 챗봇은 패널만 열어 캡처했으며 질문은 보내지 않았습니다.
