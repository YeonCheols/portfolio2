import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { App } from "./app";

describe("App", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("connect 경로는 로그인 화면을 보여주고 error 쿼리를 전달한다", () => {
    render(
      <App pathname="/admin/ai-models/connect" search="?error=login_failed" />,
    );

    expect(
      screen.getByRole("heading", { level: 1, name: "AI 모델 설정 로그인" }),
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
});
