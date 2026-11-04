import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ArchiveDetailPage } from "./archive-detail-page";

const jsonResponse = (body: unknown, status = 200) =>
  ({ ok: status < 400, status, json: async () => body }) as Response;

const archiveKey = {
  environment: "development",
  subjectHash: "subj-a",
  generationId: "gen-1",
  attemptId: "att-1",
} as const;

const broken = '{"summary": "<img src=x onerror=alert(1)> 끊긴 JSON';
const detail = {
  ok: true,
  summary: {
    ...archiveKey,
    startedAt: "2026-11-04T01:00:00.000Z",
    stages: ["started", "model_response", "failed"],
    status: "failed",
    failedAfter: "model_response",
  },
  files: [
    { name: "001-started.json", stage: "started" },
    { name: "002-model_response.json", stage: "model_response" },
    { name: "003-failed.json", stage: "failed" },
  ],
  latest: {
    request: { persona: "작성자", prompt: "요청 본문" },
    response: broken,
    validation: {
      gaps: [],
      conflicts: [],
      uncertain: [],
      validationIssues: [],
    },
    errorCode: "INVALID_MODEL_JSON",
  },
};

describe("ArchiveDetailPage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("실행 요약과 저장된 요청·원문 응답·검증 결과·오류 코드를 가공 없이 텍스트로 보여준다", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(detail)));

    const { container } = render(<ArchiveDetailPage archiveKey={archiveKey} />);

    expect(
      await screen.findByRole("heading", { level: 1, name: "실행 상세" }),
    ).toBeTruthy();
    expect(screen.getByText("att-1")).toBeTruthy();
    expect(screen.getByText("model_response 직후 실패")).toBeTruthy();
    expect(screen.getByText("INVALID_MODEL_JSON")).toBeTruthy();

    const request = screen.getByRole("region", { name: "요청 페이로드" });
    expect(request.textContent).toContain('"prompt": "요청 본문"');
    const response = screen.getByRole("region", { name: "모델 원문 응답" });
    // 깨진 JSON과 HTML처럼 보이는 문자열도 해석하지 않고 그대로 보인다
    expect(within(response).getByText(broken)).toBeTruthy();
    expect(container.querySelector("img")).toBeNull();
    expect(
      screen.getByRole("region", { name: "검증 결과" }).textContent,
    ).toContain("validationIssues");
    expect(
      screen.getByRole("link", { name: "목록으로" }).getAttribute("href"),
    ).toBe("/admin/debug/resume?environment=development&page=1");
  });

  it("단계 파일은 서명 URL을 받아 새 탭으로 열고 발급이 실패하면 그 파일에만 안내한다", async () => {
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(detail))
      .mockResolvedValueOnce(
        jsonResponse({
          ok: true,
          url: "https://storage.example.test/sign?t=1",
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ code: "STORAGE_FAILED" }, 502));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(<ArchiveDetailPage archiveKey={archiveKey} />);
    await screen.findByRole("heading", { name: "실행 상세" });

    await user.click(
      screen.getByRole("button", { name: "002-model_response.json 원본 열기" }),
    );
    await waitFor(() => expect(open).toHaveBeenCalledTimes(1));
    expect(open).toHaveBeenCalledWith(
      "https://storage.example.test/sign?t=1",
      "_blank",
      "noopener,noreferrer",
    );
    expect(fetchMock.mock.calls[1][0]).toContain(
      "file=002-model_response.json",
    );

    await user.click(
      screen.getByRole("button", { name: "003-failed.json 원본 열기" }),
    );
    expect((await screen.findByRole("alert")).textContent).toContain(
      "요청을 처리하지 못했습니다. 다시 시도해 주세요.",
    );
    expect(open).toHaveBeenCalledTimes(1);
  });

  it("없는 실행은 찾을 수 없다고 알리고 목록으로 돌아가는 링크를 둔다", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(jsonResponse({ code: "ARCHIVE_NOT_FOUND" }, 404)),
    );

    render(<ArchiveDetailPage archiveKey={archiveKey} />);

    expect((await screen.findByRole("alert")).textContent).toContain(
      "보관된 실행을 찾을 수 없습니다.",
    );
    expect(screen.getByRole("link", { name: "목록으로" })).toBeTruthy();
  });
});
