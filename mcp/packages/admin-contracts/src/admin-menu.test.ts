/** @jest-environment node */
import {
  adminMenu,
  adminMenuItems,
  adminMenuPath,
  adminPagePaths,
} from "@portfolio-mcp/admin-contracts";

describe("관리자 공통 메뉴 정의", () => {
  it("도메인과 항목 ID는 중복이 없고 모든 도메인에 항목이 있다", () => {
    const domainIds = adminMenu.map((domain) => domain.id);
    const itemIds = adminMenuItems.map((item) => item.id);

    expect(new Set(domainIds).size).toBe(domainIds.length);
    expect(new Set(itemIds).size).toBe(itemIds.length);
    for (const domain of adminMenu)
      expect(domain.items.length).toBeGreaterThan(0);
  });

  it("경로가 있는 항목은 관리자 경로 아래 서로 다른 값이고 경로가 없는 항목은 이동 목록에서 빠진다", () => {
    const paths = adminMenuItems.flatMap((item) =>
      item.path ? [item.path] : [],
    );

    expect(new Set(paths).size).toBe(paths.length);
    for (const path of paths) {
      expect(path.startsWith(`${adminMenuPath}/`)).toBe(true);
      expect(path).not.toMatch(/[?#]|\/$/);
      // 인증·정적 파일 경로를 화면으로 등록하지 못한다
      expect(path).not.toMatch(/\/(connect|oauth|logout|assets|api)(\/|$)/);
    }
    expect([...adminPagePaths].sort()).toEqual(
      [adminMenuPath, ...paths].sort(),
    );
    expect(adminMenuItems.some((item) => !item.path)).toBe(true);
  });

  it("이력서 툴 관리 항목은 도구 화면 경로를 가지고 포트폴리오 툴 관리는 준비 중으로 남는다", () => {
    const byId = Object.fromEntries(
      adminMenuItems.map((item) => [item.id, item]),
    );

    expect(byId["resume-tools"]?.path).toBe("/admin/tools/resume");
    expect(adminPagePaths).toContain("/admin/tools/resume");
    expect(byId["portfolio-tools"]?.path).toBeUndefined();
  });
});
