import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DeleteSection } from "./delete-section";

const jsonResponse = (body: unknown, status = 200) =>
  ({ ok: status < 400, status, json: async () => body }) as Response;

const archiveKey = {
  environment: "development",
  subjectHash: "subj-a",
  generationId: "gen-1",
  attemptId: "att-1",
} as const;

describe("DeleteSection", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("대상 실행 ID를 정확히 입력해야 삭제를 확정하고 성공하면 목록으로 이동한다", async () => {
    const assign = vi.fn();
    vi.stubGlobal("location", { origin: "http://localhost:8080", assign });
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ ok: true, removed: 6 }));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<DeleteSection archiveKey={archiveKey} />);

    expect(screen.queryByLabelText("삭제할 실행 ID 입력")).toBeNull();
    await user.click(screen.getByRole("button", { name: "이 실행 삭제" }));
    const confirm = screen.getByRole("button", { name: "삭제 확정" });
    expect((confirm as HTMLButtonElement).disabled).toBe(true);

    await user.type(screen.getByLabelText("삭제할 실행 ID 입력"), "att-2");
    expect((confirm as HTMLButtonElement).disabled).toBe(true);
    await user.clear(screen.getByLabelText("삭제할 실행 ID 입력"));
    await user.type(screen.getByLabelText("삭제할 실행 ID 입력"), "att-1");
    expect((confirm as HTMLButtonElement).disabled).toBe(false);
    await user.click(confirm);

    await waitFor(() =>
      expect(assign).toHaveBeenCalledWith(
        "/admin/debug/resume?environment=development&page=1",
      ),
    );
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      ...archiveKey,
      confirm: "att-1",
    });
  });

  it("일부만 지워지면 개수를 알리고 이동하지 않으며 취소하면 확인 영역을 닫는다", async () => {
    const assign = vi.fn();
    vi.stubGlobal("location", { origin: "http://localhost:8080", assign });
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          jsonResponse(
            { ok: false, code: "DELETE_PARTIAL", removed: 5, remaining: 1 },
            502,
          ),
        ),
    );
    const user = userEvent.setup();
    render(<DeleteSection archiveKey={archiveKey} />);

    await user.click(screen.getByRole("button", { name: "이 실행 삭제" }));
    await user.type(screen.getByLabelText("삭제할 실행 ID 입력"), "att-1");
    await user.click(screen.getByRole("button", { name: "삭제 확정" }));

    expect((await screen.findByRole("alert")).textContent).toContain(
      "일부만 삭제되었습니다. 삭제 5개, 남음 1개입니다.",
    );
    expect(assign).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "취소" }));
    expect(screen.queryByLabelText("삭제할 실행 ID 입력")).toBeNull();
  });
});
