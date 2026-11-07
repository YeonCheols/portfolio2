import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ArchiveListPage } from "./archive-list-page";

const jsonResponse = (body: unknown, status = 200) =>
  ({ ok: status < 400, status, json: async () => body }) as Response;

const failed = {
  subjectHash: "subj-a",
  generationId: "gen-1",
  attemptId: "att-1",
  startedAt: "2026-11-04T01:00:00.000Z",
  stages: ["started", "model_response", "failed"],
  status: "failed",
  failedAfter: "model_response",
};
const completed = {
  subjectHash: "subj-b",
  generationId: "gen-2",
  attemptId: "att-2",
  stages: ["started", "completed"],
  status: "completed",
};

describe("ArchiveListPage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("URL의 조건으로 목록을 조회하고 실행마다 상태와 상세 링크를 보여주며 페이지 링크는 조건을 유지한다", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        jsonResponse({ ok: true, items: [failed, completed], hasMore: true }),
      );
    vi.stubGlobal("fetch", fetchMock);

    render(
      <ArchiveListPage search="?environment=production&generationId=gen-1&failedStage=validation&page=2" />,
    );

    const detail = await screen.findByRole("link", { name: /att-1/ });
    expect(fetchMock).toHaveBeenCalledWith(
      "/admin/debug/resume/api/archives?environment=production&generationId=gen-1&failedStage=validation&page=2",
      expect.anything(),
    );
    expect(detail.getAttribute("href")).toBe(
      "/admin/debug/resume?environment=production&subjectHash=subj-a&generationId=gen-1&attemptId=att-1",
    );
    const row = detail.closest("li") as HTMLElement;
    expect(within(row).getByText("실패")).toBeTruthy();
    expect(within(row).getByText("model_response 직후 실패")).toBeTruthy();
    expect(screen.getByText("완료")).toBeTruthy();

    const form = screen.getByRole("form", { name: "실행 필터" });
    expect(form.getAttribute("method")).toBe("get");
    expect(form.getAttribute("action")).toBe("/admin/debug/resume");
    // 선택 상자는 모델 관리 화면과 같은 SelectField이고, GET 폼 제출 값은 숨은 입력이 싣는다
    expect(within(form).getByRole("button", { name: "환경" }).textContent).toBe(
      "운영",
    );
    expect(
      within(form).getByRole("button", { name: "실패 단계" }).textContent,
    ).toBe("validation");
    expect(
      (within(form).getByLabelText("생성 ID") as HTMLInputElement).value,
    ).toBe("gen-1");
    expect(Object.fromEntries(new FormData(form as HTMLFormElement))).toEqual({
      environment: "production",
      generationId: "gen-1",
      attemptId: "",
      failedStage: "validation",
    });

    expect(
      screen.getByRole("link", { name: "이전 페이지" }).getAttribute("href"),
    ).toBe(
      "/admin/debug/resume?environment=production&generationId=gen-1&failedStage=validation&page=1",
    );
    expect(
      screen.getByRole("link", { name: "다음 페이지" }).getAttribute("href"),
    ).toBe(
      "/admin/debug/resume?environment=production&generationId=gen-1&failedStage=validation&page=3",
    );
  });

  it("목록을 조회하는 동안 로딩 표시를 보여주고 조회가 끝나면 숨긴다", async () => {
    let resolveFetch!: (response: Response) => void;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockReturnValue(
        new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        }),
      ),
    );

    render(<ArchiveListPage search="" />);

    expect(screen.getByRole("status").textContent).toContain("불러오는 중");
    expect(screen.getByTestId("loading-spinner")).toBeTruthy();

    resolveFetch(jsonResponse({ ok: true, items: [], hasMore: false }));

    await waitFor(() =>
      expect(screen.queryByTestId("loading-spinner")).toBeNull(),
    );
  });

  it("첫 페이지에는 이전 링크가 없고 결과가 없으면 빈 상태를, 조회가 실패하면 오류를 알린다", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          jsonResponse({ ok: true, items: [], hasMore: false }),
        )
        .mockResolvedValueOnce(jsonResponse({ code: "STORAGE_FAILED" }, 502)),
    );

    const { unmount } = render(<ArchiveListPage search="" />);
    expect(
      await screen.findByText("조건에 맞는 보관 기록이 없습니다."),
    ).toBeTruthy();
    expect(screen.queryByRole("link", { name: "이전 페이지" })).toBeNull();
    expect(screen.queryByRole("link", { name: "다음 페이지" })).toBeNull();
    unmount();

    render(<ArchiveListPage search="?environment=bogus&page=0" />);
    expect((await screen.findByRole("alert")).textContent).toContain(
      "요청을 처리하지 못했습니다. 다시 시도해 주세요.",
    );
  });

  it("선택 상자에서 항목을 고르면 폼 제출 값이 바뀌고 전체를 고르면 조건이 비워진다", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          jsonResponse({ ok: true, items: [], hasMore: false }),
        ),
    );
    const user = userEvent.setup();
    render(<ArchiveListPage search="?failedStage=pdf" />);
    const form = await screen.findByRole("form", { name: "실행 필터" });

    await user.click(within(form).getByRole("button", { name: "환경" }));
    await user.click(screen.getByRole("option", { name: "운영" }));
    await user.click(within(form).getByRole("button", { name: "실패 단계" }));
    await user.click(screen.getByRole("option", { name: "전체" }));

    expect(
      Object.fromEntries(new FormData(form as HTMLFormElement)),
    ).toMatchObject({
      environment: "production",
      failedStage: "",
    });
    expect(within(form).getByRole("button", { name: "환경" }).textContent).toBe(
      "운영",
    );
  });
});
