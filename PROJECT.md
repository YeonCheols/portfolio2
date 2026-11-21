```json
{
  "schemaVersion": 1,
  "slug": "portfolio",
  "title": "포트폴리오 웹사이트",
  "description": "작업한 프로젝트와 경력, 학습 기록을 한곳에 모아 보여 주는 개인 포트폴리오 사이트입니다. 프로젝트 데이터는 별도 API에서 받아 오고, 프로젝트 상세·태그 탐색·⌘K 검색 팔레트·JS 플레이그라운드·방명록을 함께 제공합니다.",
  "image": "https://raw.githubusercontent.com/side-projects-labs/portfolio2/229db447d2b6c0913cc67aa1e45aeba5a10b00b7/PROJECT.png",
  "stacks": [
    "Next.js",
    "React.js",
    "TypeScript",
    "TailwindCSS",
    "SWR",
    "Zustand",
    "Jest",
    "GitHub Actions"
  ],
  "linkDemo": "https://www.ycseng.com",
  "linkGithub": "https://github.com/side-projects-labs/portfolio2"
}
```

# 포트폴리오 웹사이트

## 목차

- [흩어진 작업을 한곳에 모으기까지](#흩어진-작업을-한곳에-모으기까지)
- [첫 화면과 사이트 구성](#첫-화면과-사이트-구성)
- [프로젝트를 소개하는 화면](#프로젝트를-소개하는-화면)
- [경력과 학습을 정리한 화면](#경력과-학습을-정리한-화면)
- [방문자가 직접 써 보는 기능](#방문자가-직접-써-보는-기능)
- [구조와 구현 선택](#구조와-구현-선택)
- [마치며](#마치며)

작업한 프로젝트가 늘어날수록 "무엇을 만들었는지"를 한 번에 보여 줄 곳이 필요했습니다. 이력서 한 장에는 어떤 문제를 풀었고 어떤 기술을 골랐는지까지 담기 어려웠습니다. 프로젝트마다 저장소와 문서가 흩어져 있어 처음 보는 사람이 흐름을 따라가기도 힘들었습니다. 이 사이트는 그 공백을 메우려고 만든 개인 포트폴리오입니다.

## 흩어진 작업을 한곳에 모으기까지

처음 목표는 단순했습니다. 소개와 경력, 프로젝트를 한 사이트에서 읽게 하는 것이었습니다. 그런데 사이트를 만들다 보니 몇 가지 요구가 더 생겼습니다.

- 프로젝트가 추가될 때마다 사이트 코드를 고치지 않고 내용을 갱신하고 싶었습니다.
- 경력처럼 자주 바뀌지 않는 정보는 화면 코드와 분리해 한곳에서 관리하고 싶었습니다.
- 글만 읽히는 사이트가 아니라 방문자가 직접 눌러 보고 써 볼 수 있는 사이트이길 바랐습니다.

그래서 역할을 나눴습니다. 이 저장소(`portfolio2`)는 방문자가 보는 화면을 맡고 나머지는 각자의 저장소가 담당합니다.

- **portfolio-api**: 프로젝트·프로필·기술 태그 데이터를 저장하고 제공합니다.
- **portfolio-admin**: 프로젝트 정보와 본문, 이미지를 편집하는 관리 화면입니다.
- **portfolio-hub**: 각 저장소 루트의 `PROJECT.md`를 읽어 프로젝트 소개로 반영합니다.
- **portfolio-config**: 환경별 실행 설정을 코드 밖에서 관리합니다.
- **portfolio-core-ui**: 프로젝트 미리보기와 태그 표시 같은 공통 UI를 패키지로 제공합니다.

웹은 "보여 주는 일"에 집중하고 데이터가 어디에 저장되는지는 API 뒤로 숨깁니다. 방문자의 브라우저는 사이트의 API 경로만 호출합니다. 그 경로가 `portfolio-api`와 외부 서비스로 요청을 중계합니다.

![방문자 브라우저, 포트폴리오 웹, 외부 API의 연결 구조](https://raw.githubusercontent.com/side-projects-labs/portfolio2/229db447d2b6c0913cc67aa1e45aeba5a10b00b7/public/project/architecture.png)

_웹은 데이터 조회와 챗봇 요청을 Next.js의 API 경로로 중계하고 실행 설정은 `portfolio-config`에서 환경별로 받습니다._

## 첫 화면과 사이트 구성

첫 화면은 짧은 소개 문구로 시작해 **대표 프로젝트**와 최근 정리한 프로젝트 카드를 차례로 보여 줍니다. 대표 프로젝트는 큰 카드로 올려 방문자가 가장 먼저 읽었으면 하는 작업(알바몬 서비스의 MSA 전환과 React 마이그레이션)이 눈에 들어오게 했습니다. 카드에서 상세 소개로 바로 이동합니다.

화면 왼쪽 사이드바는 모든 페이지에서 같은 자리에 있습니다. 검색 팔레트를 여는 입력창, Home·About·Projects·Learn·Guestbook·태그 모음 메뉴, 앱 영역(JS Playground), 테마 전환이 차례로 놓입니다. 오른쪽 아래에는 챗봇 버튼이 항상 떠 있습니다. 페이지가 열릴 때는 AOS 라이브러리로 내용이 아래에서 위로 부드럽게 올라오는 효과를 줍니다. 스타일은 TailwindCSS의 `dark:` 클래스로 라이트·다크 두 테마를 모두 지원합니다. 코드 작성 화면인 플레이그라운드만은 에디터와 콘솔을 넓게 쓰도록 사이드바 없는 전체 폭 레이아웃을 따로 씁니다.

![포트폴리오 웹 첫 화면: 소개, 대표 프로젝트, 최근 프로젝트](https://raw.githubusercontent.com/side-projects-labs/portfolio2/229db447d2b6c0913cc67aa1e45aeba5a10b00b7/public/project/home.png)

_실제 배포 화면입니다. 대표 프로젝트 카드에서 상세 소개로 이어지고 아래에는 최근 정리한 프로젝트가 카드로 이어집니다._

## 프로젝트를 소개하는 화면

### 프로젝트 목록

프로젝트 화면은 개인 프로젝트와 회사 프로젝트를 같은 카드 형태로 보여 줍니다. 카드마다 대표 이미지, 제목, 요약, 사용 기술 아이콘이 붙습니다. 긴 설명은 말줄임으로 줄여 카드 높이를 맞췄습니다. 데이터는 `portfolio-api`의 검색 API에서 페이지 단위로 받아 오고 기술 아이콘과 색상도 API의 기술 태그 정보로 그립니다. 그래서 새 프로젝트나 새 태그가 등록되면 화면 코드는 그대로 둬도 목록에 나타납니다.

![프로젝트 목록 화면](https://raw.githubusercontent.com/side-projects-labs/portfolio2/229db447d2b6c0913cc67aa1e45aeba5a10b00b7/public/project/projects.png)

_카드 하나가 이미지, 제목, 요약, 기술 아이콘을 같은 위치에 보여 줍니다._

### 프로젝트 상세

카드를 누르면 `/projects/<slug>` 상세 화면으로 이동합니다. 상세 화면은 요청마다 서버에서 `portfolio-api`의 프로젝트 한 건을 받아 와 렌더링합니다. 위쪽에는 제목과 요약, 기술 스택 아이콘, 저장소(Source Code)와 배포(Live Demo) 링크를 둡니다. 그 아래에 대표 이미지와 마크다운 본문을 보여 줍니다. 본문은 `portfolio-core-ui`의 프로젝트 미리보기 컴포넌트가 그립니다.

이 문서도 같은 경로를 지납니다. 저장소의 `PROJECT.md`가 `portfolio-hub`를 거쳐 API에 저장되면 이 사이트의 상세 화면이 그 내용을 그대로 읽어 보여 줍니다. 공유될 때 제목·설명·대표 이미지가 올바르게 보이도록 페이지마다 canonical 주소와 Open Graph 정보도 함께 설정합니다.

![프로젝트 상세 화면: 제목, 요약, 기술 스택, 링크, 대표 이미지, 본문](https://raw.githubusercontent.com/side-projects-labs/portfolio2/229db447d2b6c0913cc67aa1e45aeba5a10b00b7/public/project/project-detail.png)

_포트폴리오 관리자 프로젝트를 상세 화면에서 연 모습입니다. 본문은 API에 저장된 마크다운입니다._

### 대표 프로젝트 전용 상세

가장 먼저 보여 주고 싶은 알바몬 MSA 프로젝트는 일반 상세와 별도로 `/projects/albamon-msa` 화면을 만들었습니다. 진행 기간과 서비스 링크, 사용한 기술을 칩으로 정리한 영역을 넣고 글 안에서 이동하는 프로젝트 목차도 두어 긴 소개를 읽기 쉽게 구성했습니다.

![대표 프로젝트 전용 상세 화면](https://raw.githubusercontent.com/side-projects-labs/portfolio2/229db447d2b6c0913cc67aa1e45aeba5a10b00b7/public/project/featured-project.png)

_MSA 전환을 표현한 대표 이미지 아래에 진행 기간과 기술 스택이 이어집니다._

### 태그로 탐색하기

태그 화면은 등록된 모든 기술 태그를 프로젝트 수와 함께 보여 줍니다. 이름으로 검색하고 이름순 또는 프로젝트 수순으로 정렬할 수 있습니다. 태그를 누르면 그 기술을 쓴 프로젝트만 모아 보는 화면으로 이동합니다. 이 목록은 서버에서 `portfolio-api`의 태그별 조회를 호출해 구성합니다. "React를 쓴 작업만 보고 싶다"는 요구를 프로젝트를 하나씩 열지 않고 해결하려고 만들었습니다.

![기술 태그 모음 화면](https://raw.githubusercontent.com/side-projects-labs/portfolio2/229db447d2b6c0913cc67aa1e45aeba5a10b00b7/public/project/tags.png)

_태그마다 연결된 프로젝트 수를 함께 표시하고 검색과 정렬을 지원합니다._

## 경력과 학습을 정리한 화면

### 소개와 경력

About 화면은 소개, 타임라인, 경력사항, 이력서, 교육의 다섯 탭으로 나눴습니다. 경력 데이터는 설정 파일 하나(`shared/config/careers`)에 두고 타임라인과 경력 카드 목록이 같은 데이터를 읽습니다. 그래서 경력을 고치면 두 화면이 함께 바뀝니다. 경력 카드는 직무와 회사, 기간과 근속 기간, 고용 형태를 먼저 보여 주고 담당 업무는 펼쳐서 읽도록 해 한 화면에서 전체 흐름을 훑을 수 있습니다. 이력서 탭에서는 경력기술서 PDF를 내려받을 수 있습니다.

![About 화면의 경력사항 탭](https://raw.githubusercontent.com/side-projects-labs/portfolio2/229db447d2b6c0913cc67aa1e45aeba5a10b00b7/public/project/about-career.png)

_경력은 카드 목록으로 보여 주고 담당 업무는 접어 두었습니다._

이력서를 만드는 일은 웹과 따로 다룹니다. `src/contents/resume/resume.xml`에 이력서 원문을 구조화해 둡니다. 저장소 안의 `mcp/` 디렉터리는 MCP 서버입니다. 이 원문을 선택·조합해 AI로 초안을 쓰고 PDF로 변환합니다. `mcp/`는 자체 `package.json`과 잠금 파일, 컨테이너 설정이 따로 있는 독립 경계라서 웹 앱의 소스를 가져오지 않습니다. 나중에 별도 저장소로 떼어 낼 수도 있습니다.

### 학습 기록

Learn 화면은 공부한 내용을 강의 형태로 정리한 공간입니다. 과정 카드에는 레슨 수와 난이도, 새 과정을 알리는 배지가 붙습니다. 과정을 열면 레슨 목록과 본문으로 이어집니다. 현재는 JavaScript 기초(변수, 타입, 연산자 등 11개 레슨)와 문제 풀이(6개 레슨) 두 과정을 MDX 파일로 보관합니다. 본문이 코드 저장소 안에 있어서 설명과 코드 블록을 같은 방식으로 관리하고 코드 블록은 문법 강조와 함께 렌더링합니다.

![Learn 화면의 학습 과정 목록](https://raw.githubusercontent.com/side-projects-labs/portfolio2/229db447d2b6c0913cc67aa1e45aeba5a10b00b7/public/project/learn.png)

_MDX로 작성한 과정을 카드로 노출합니다._

## 방문자가 직접 써 보는 기능

### ⌘K 검색 팔레트

어느 화면에서든 `⌘K`로 검색 팔레트를 열어 페이지를 이동할 수 있습니다. 사이드바 메뉴 대신 키보드만으로 원하는 화면에 가도록 만든 기능입니다. 현재 위치에는 "You are here"를 표시해 이동 대상을 헷갈리지 않게 했습니다. 팔레트에는 입력한 질문을 AI 응답 화면으로 넘기는 구성 요소와 API 연동도 함께 들어 있습니다.

![⌘K로 연 검색 팔레트](https://raw.githubusercontent.com/side-projects-labs/portfolio2/229db447d2b6c0913cc67aa1e45aeba5a10b00b7/public/project/command-palette.png)

_배경은 흐리게 처리하고 이동할 수 있는 페이지 목록을 보여 줍니다._

### AI 기술 챗봇

오른쪽 아래 버튼으로 여는 챗봇은 프로그래밍과 기술에 관한 질문에 답하도록 만든 기술 멘토입니다. 시스템 프롬프트로 "친근하고 명확한 멘토" 역할을 줍니다. 여기에 질문자의 수준(초급·중급·고급)에 따라 설명의 깊이가 달라지도록 프롬프트를 덧붙입니다. 질문 유형은 자동으로 감지해 유형별 프롬프트를 고릅니다. 첫 질문에서 만든 대화 세션 ID를 이어서 보내 이전 대화도 기억합니다. 브라우저는 모델 API를 직접 부르지 않고 사이트의 API 경로를 거치기 때문에 모델 키는 서버 쪽에만 둡니다.

![AI 챗봇 패널](https://raw.githubusercontent.com/side-projects-labs/portfolio2/229db447d2b6c0913cc67aa1e45aeba5a10b00b7/public/project/ai-chat.png)

_"React hooks는 어떻게 사용하나요?" 같은 기술 질문을 예시로 안내하고 이전 대화를 기억한다는 점을 함께 알려 줍니다._

### JS 플레이그라운드

별도 도구 없이 짧은 JavaScript를 바로 실행해 볼 수 있는 화면입니다. 왼쪽 에디터는 VS Code와 같은 Monaco 에디터입니다. 실행 버튼을 누르면 브라우저에서 코드를 실행해 오른쪽 콘솔에 결과를 출력합니다. 에디터와 콘솔 패널의 크기는 가운데 구분선을 끌어서 조절하고 전체 화면으로 넓힐 수도 있습니다.

![JS 플레이그라운드 화면](https://raw.githubusercontent.com/side-projects-labs/portfolio2/229db447d2b6c0913cc67aa1e45aeba5a10b00b7/public/project/playground.png)

_에디터와 콘솔을 나란히 두고 패널 크기는 드래그로 조절합니다._

### 방명록

방문자가 이름과 메시지를 남기는 방명록입니다. 이름은 50자, 메시지는 500자까지 입력하며 현재 글자 수를 입력창 아래에 보여 줍니다. 남겨진 글에는 댓글을 달 수 있습니다. 글이 없을 때는 첫 방명록을 남기도록 안내하는 빈 상태 화면이 나옵니다.

![방명록 화면](https://raw.githubusercontent.com/side-projects-labs/portfolio2/229db447d2b6c0913cc67aa1e45aeba5a10b00b7/public/project/guestbook.png)

_입력 제한과 빈 상태 안내를 함께 구성했습니다._

## 구조와 구현 선택

### 레이어를 나눈 폴더 구조

코드는 Feature-Sliced Design으로 나눴습니다. 의존 방향은 `pages → widgets → features → entities → shared`로 한쪽으로만 흐릅니다.

```text
src/
├── pages/      라우트. 레이아웃과 데이터 전달만 담당
├── widgets/    여러 기능을 조합한 화면 단위 UI
├── features/   about, blog, chat, cmdpallete, contact, dashboard,
│               guestbook, home, learn, playground, projects
├── entities/   이력서 모델
├── shared/     api, config, hooks, lib, styles, types, ui
└── contents/   학습 MDX와 이력서 XML
```

기능마다 `ui`, `model`, `api`와 공개용 `index.ts`를 두고 다른 기능의 내부 파일은 직접 가져오지 않습니다. 화면을 하나 고칠 때 영향 범위를 기능 폴더 안으로 좁히기 위한 규칙입니다. `pages`에는 비즈니스 로직을 두지 않고 `shared`에는 특정 기능 전용 코드를 두지 않습니다.

### 데이터와 상태

프로젝트·프로필·기술 태그는 Next.js의 API 경로가 `portfolio-api`를 호출해 가져옵니다. 화면에서는 SWR로 조회하고 캐시합니다. 화면 사이에서 공유해야 하는 값(블로그 목록 상태 등)은 Zustand 스토어로 관리합니다. 서버에서 바로 그려야 하는 화면(프로젝트 상세, 태그별 목록)은 `getServerSideProps`로 데이터를 받아 검색 엔진과 공유 미리보기에도 내용이 담기게 했습니다. 공통 UI는 `@yeoncheols/portfolio-core-ui` 패키지를 재사용합니다.

### 설정과 배포

환경별 실행 설정은 코드 저장소 밖의 `portfolio-config`에서 받아 주입합니다. 운영 배포는 GitHub Actions가 이미지를 빌드해 Cloud Run에 올리는 흐름입니다. Vercel은 테스트 용도로 유지합니다. 같은 설정 방식을 개발 서버, 빌드, 운영 서버가 모두 써서 환경마다 설정이 달라지는 일을 줄였습니다. 컨테이너로 로컬 서버를 띄우는 명령(`pnpm local:up`)도 마련했습니다.

### 품질을 지키는 방법

컴포넌트와 API 모듈마다 Jest 테스트 파일을 옆에 둡니다. 화면 단위 시나리오는 Playwright 통합 테스트로 검증합니다. 커밋은 Husky와 commitlint로 Conventional Commits 형식을 강제합니다. `master`로 가는 PR은 린트·포맷 검사·타입 검사·단위 테스트와 통합 테스트가 모두 통과해야 머지됩니다. 저장소에는 AI 에이전트가 따를 작업 규칙(`AGENTS.md`)도 두어 테스트 먼저 작성하기, 커밋·PR 절차, 리뷰 기준을 사람과 같은 방식으로 적용합니다.

## 마치며

포트폴리오를 만들면서 화면을 꾸미는 일보다 작업을 계속 쌓을 수 있는 구조에 더 신경을 썼습니다. 프로젝트 소개는 코드 밖의 데이터로 옮겨 화면 수정 없이 갱신되게 했습니다. 경력과 학습 기록은 설정과 MDX로 분리해 한곳에서 고치게 했습니다. 지금은 이 저장소의 `PROJECT.md`가 허브와 API를 거쳐 이 사이트의 상세 화면에 그려집니다.

방문자가 직접 눌러 보고 써 보도록 검색 팔레트, 태그 탐색, 플레이그라운드, 방명록, 챗봇 같은 기능도 함께 넣었습니다. 새 프로젝트가 생기면 그 저장소의 소개 문서를 갱신하는 것만으로 이 사이트에 반영되는 만큼, 앞으로도 같은 구조에서 작업과 기록을 계속 이어 갈 수 있습니다.
