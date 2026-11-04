import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { adminMenu } from "../../../src/auth/adminMenu";

import { AdminMenuPage } from "./admin-menu-page";

describe("AdminMenuPage", () => {
  it("공통 메뉴 정의의 도메인과 항목을 그대로 보여주고 경로가 있는 항목만 링크로 만든다", () => {
    render(<AdminMenuPage />);

    expect(
      screen.getByRole("heading", { level: 1, name: "관리 메뉴" }),
    ).toBeTruthy();
    for (const domain of adminMenu) {
      const region = screen.getByRole("region", { name: domain.label });
      expect(
        within(region).getByRole("heading", { level: 2, name: domain.label }),
      ).toBeTruthy();
      for (const item of domain.items) {
        expect(within(region).getByText(item.description)).toBeTruthy();
        const link = within(region).queryByRole("link", { name: item.label });
        if (item.path) {
          expect(link?.getAttribute("href")).toBe(item.path);
        } else {
          expect(link).toBeNull();
        }
      }
    }
  });

  it("아직 화면이 없는 항목은 이동할 수 없는 준비 중 항목으로 표시한다", () => {
    render(<AdminMenuPage />);

    const planned = adminMenu
      .flatMap((domain) => domain.items)
      .filter((item) => !item.path);
    expect(planned.length).toBeGreaterThan(0);
    for (const item of planned) {
      const entry = screen.getByText(item.label).closest("li") as HTMLElement;
      expect(entry.getAttribute("aria-disabled")).toBe("true");
      expect(within(entry).getByText("준비 중")).toBeTruthy();
      expect(within(entry).queryByRole("link")).toBeNull();
    }
  });
});
