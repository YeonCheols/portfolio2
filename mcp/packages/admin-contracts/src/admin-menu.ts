// 관리자 메뉴의 단일 정의. 서버(로그인 복귀 허용 목록)와 관리자 앱(메뉴 화면·내비게이션)이 함께 가져오므로
// 다른 모듈을 import하지 않는 순수 데이터로 둔다. 화면 구성이나 항목 정보를 바꿀 때는 이 파일만 고친다.
export type AdminMenuItem = {
  id: string;
  label: string;
  description: string;
  // 없으면 아직 만들지 않은 화면이라 "준비 중"으로만 보여준다
  path?: string;
};

export type AdminMenuDomain = {
  id: string;
  label: string;
  items: readonly AdminMenuItem[];
};

export const adminMenuPath = "/admin";

export const adminMenu: readonly AdminMenuDomain[] = [
  {
    id: "resume",
    label: "이력서",
    items: [
      {
        id: "ai-models",
        label: "AI 모델 설정",
        description: "개발·운영 MCP가 쓰는 모델과 API 키를 관리합니다.",
        path: "/admin/ai-models",
      },
      {
        id: "debug-archive",
        label: "디버깅 아카이브",
        description: "이력서 생성 기록을 조회하고 수정본·재현·삭제를 합니다.",
        path: "/admin/debug/resume",
      },
      {
        id: "resume-tools",
        label: "이력서 툴 관리",
        description: "이력서 MCP 도구를 관리하고 테스트합니다.",
        path: "/admin/tools/resume",
      },
    ],
  },
  {
    id: "portfolio",
    label: "포트폴리오",
    items: [
      {
        id: "portfolio-tools",
        label: "포트폴리오 툴 관리",
        description: "포트폴리오 MCP 도구를 관리하고 테스트합니다.",
      },
    ],
  },
];

export const adminMenuItems: readonly AdminMenuItem[] = adminMenu.flatMap(
  (domain) => domain.items,
);

// 로그인 뒤 돌아가거나 이동할 수 있는 화면 경로: 메뉴 화면과 경로가 있는 항목
export const adminPagePaths: readonly string[] = [
  adminMenuPath,
  ...adminMenuItems.flatMap((item) => (item.path ? [item.path] : [])),
];
