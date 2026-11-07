import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { adminMenuItems } from "@portfolio-mcp/admin-contracts";

import { App, pageRegistry } from "./app";

describe("App", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("connect 경로는 로그인 화면을 보여주고 error 쿼리를 전달한다", () => {
    render(
      <App pathname="/admin/ai-models/connect" search="?error=login_failed" />,
    );

    expect(
      screen.getByRole("heading", { level: 1, name: "MCP 관리자 로그인" }),
    ).toBeTruthy();
    expect(screen.getByRole("alert")).toBeTruthy();
  });
  it("디버깅 아카이브 경로는 조건이 없으면 목록을, 실행 키가 있으면 상세를 보여준다", async () => {
    const jsonResponse = (body: unknown) =>
      ({ ok: true, status: 200, json: async () => body }) as Response;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (path: string) =>
        jsonResponse(
          path.includes("/detail")
            ? {
                ok: true,
                summary: {
                  subjectHash: "subj-a",
                  generationId: "gen-1",
                  attemptId: "att-1",
                  stages: ["started"],
                  status: "incomplete",
                },
                files: [],
                latest: null,
              }
            : { ok: true, items: [], hasMore: false },
        ),
      ),
    );

    const { unmount } = render(
      <App pathname="/admin/debug/resume/" search="" />,
    );
    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "이력서 디버깅 아카이브",
      }),
    ).toBeTruthy();
    unmount();

    render(
      <App
        pathname="/admin/debug/resume"
        search="?environment=development&subjectHash=subj-a&generationId=gen-1&attemptId=att-1"
      />,
    );
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { level: 1, name: "실행 상세" }),
      ).toBeTruthy(),
    );
  });

  it("connect 경로의 next 쿼리를 로그인 화면에 전달한다", () => {
    render(
      <App
        pathname="/admin/ai-models/connect"
        search="?next=%2Fadmin%2Fdebug%2Fresume"
      />,
    );

    const form = screen
      .getByRole("button", { name: "GitHub로 로그인" })
      .closest("form");
    expect(form?.getAttribute("action")).toBe(
      "/admin/ai-models/oauth/start?next=%2Fadmin%2Fdebug%2Fresume",
    );
  });

  it("/admin 경로는 슬래시가 붙어도 관리 메뉴를 보여준다", () => {
    const { unmount } = render(<App pathname="/admin" search="" />);
    expect(
      screen.getByRole("heading", { level: 1, name: "관리 메뉴" }),
    ).toBeTruthy();
    unmount();

    render(<App pathname="/admin/" search="" />);
    expect(
      screen.getByRole("heading", { level: 1, name: "관리 메뉴" }),
    ).toBeTruthy();
  });

  it("메뉴 정의에서 경로가 있는 항목마다 화면이 등록돼 있고 정의에 없는 화면 등록은 없다", () => {
    const withPath = adminMenuItems.filter((item) => item.path);

    for (const item of withPath)
      expect(pageRegistry[item.id]).toBeTypeOf("function");
    expect(Object.keys(pageRegistry).sort()).toEqual(
      withPath.map((item) => item.id).sort(),
    );
  });

  it("메뉴에 등록된 경로는 알림 화면이 아니라 등록된 화면으로 열고 모르는 경로는 안내한다", () => {
    // 각 화면이 마운트 때 부르는 API는 끝나지 않는 응답으로 막아 화면 선택만 확인한다
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise(() => {})),
    );

    for (const item of adminMenuItems.filter((entry) => entry.path)) {
      const { unmount } = render(<App pathname={item.path!} search="" />);
      expect(screen.queryByText("페이지를 찾을 수 없습니다")).toBeNull();
      unmount();
    }

    render(<App pathname="/admin/unknown" search="" />);
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "페이지를 찾을 수 없습니다",
      }),
    ).toBeTruthy();
    expect(
      screen.getAllByRole("link", { name: "메뉴" })[0]?.getAttribute("href"),
    ).toBe("/admin");
  });

  it("등록된 화면은 필요할 때 불러오고 불러오는 동안 현재 위치와 안내를 먼저 보여준다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, status: 200, json: async () => [] })),
    );

    render(<App pathname="/admin/ai-models" search="" />);

    // 화면 코드가 도착하기 전에는 레이아웃과 안내만 보이고, 도착하면 화면으로 바뀐다
    expect(screen.getByRole("status").textContent).toContain(
      "화면을 불러오는 중입니다.",
    );
    expect(screen.getByTestId("loading-spinner")).toBeTruthy();
    expect(
      screen.getByRole("navigation", { name: "현재 위치" }).textContent,
    ).toContain("AI 모델 설정");
    expect(
      await screen.findByRole("heading", { level: 1, name: "AI 모델 설정" }),
    ).toBeTruthy();
    expect(screen.queryByText("화면을 불러오는 중입니다.")).toBeNull();
  });
});
