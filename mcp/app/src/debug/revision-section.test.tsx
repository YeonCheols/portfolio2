import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ArchiveDetail } from "../types";

import { RevisionSection } from "./revision-section";

const jsonResponse = (body: unknown, status = 200) =>
  ({ ok: status < 400, status, json: async () => body }) as Response;

const archiveKey = {
  environment: "development",
  subjectHash: "subj-a",
  generationId: "gen-1",
  attemptId: "att-1",
} as const;

const detail: ArchiveDetail = {
  summary: { ...archiveKey, stages: ["started", "failed"], status: "failed" },
  files: [
    { name: "001-started.json", stage: "started" },
    { name: "004-failed.json", stage: "failed" },
  ],
  latest: {
    request: { persona: "작성자", prompt: "요청 본문" },
    response: '{"claims": [끊긴',
  },
};

const fixedResponse = '{"claims":[]}';

describe("RevisionSection", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("저장된 요청·응답을 채워 보여주고 고친 값을 마지막 단계 파일 기준 수정본으로 저장한다", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ ok: true, revisionId: "rev-1" }));
    vi.stubGlobal("fetch", fetchMock);
    const onSaved = vi.fn();
    const user = userEvent.setup();
    render(
      <RevisionSection
        archiveKey={archiveKey}
        detail={detail}
        revisions={[]}
        onSaved={onSaved}
      />,
    );

    const response = screen.getByLabelText(
      "수정할 응답",
    ) as HTMLTextAreaElement;
    expect(response.value).toBe('{"claims": [끊긴');
    expect(
      (screen.getByLabelText("수정할 요청 페이로드") as HTMLTextAreaElement)
        .value,
    ).toContain('"prompt": "요청 본문"');

    fireEvent.change(response, { target: { value: fixedResponse } });
    await user.click(screen.getByRole("button", { name: "수정본으로 저장" }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/admin/debug/resume/api/archives/revisions");
    expect(JSON.parse(init.body)).toEqual({
      ...archiveKey,
      baseFile: "004-failed.json",
      request: { persona: "작성자", prompt: "요청 본문" },
      response: fixedResponse,
    });
    expect((await screen.findByRole("status")).textContent).toContain(
      "수정본을 저장했습니다",
    );
  });

  it("요청 페이로드가 JSON이 아니면 보내지 않고 서버가 거부하면 안내하며 저장 완료로 처리하지 않는다", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        jsonResponse({ ok: false, code: "UNKNOWN_SOURCE_REF" }, 422),
      );
    vi.stubGlobal("fetch", fetchMock);
    const onSaved = vi.fn();
    const user = userEvent.setup();
    render(
      <RevisionSection
        archiveKey={archiveKey}
        detail={detail}
        revisions={[]}
        onSaved={onSaved}
      />,
    );

    fireEvent.change(screen.getByLabelText("수정할 요청 페이로드"), {
      target: { value: "{깨짐" },
    });
    await user.click(screen.getByRole("button", { name: "수정본으로 저장" }));
    expect((await screen.findByRole("alert")).textContent).toContain(
      "요청 페이로드가 올바른 JSON이 아닙니다.",
    );
    expect(fetchMock).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("수정할 요청 페이로드"), {
      target: { value: "" },
    });
    await user.click(screen.getByRole("button", { name: "수정본으로 저장" }));
    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toContain("출처"),
    );
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).not.toHaveProperty(
      "request",
    );
    expect(onSaved).not.toHaveBeenCalled();
  });

  it("저장된 수정본 목록에서 하나를 불러오면 편집 영역을 그 값으로 바꾼다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        ok: true,
        revision: {
          revisionId: "rev-1",
          response: "수정본 응답",
          request: { persona: "p", prompt: "q" },
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(
      <RevisionSection
        archiveKey={archiveKey}
        detail={detail}
        revisions={[
          { revisionId: "rev-1", createdAt: "2026-11-04T01:00:00.000Z" },
        ]}
        onSaved={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "rev-1 불러오기" }));

    await waitFor(() =>
      expect(
        (screen.getByLabelText("수정할 응답") as HTMLTextAreaElement).value,
      ).toBe("수정본 응답"),
    );
    expect(fetchMock.mock.calls[0][0]).toContain("revisionId=rev-1");
  });
});
