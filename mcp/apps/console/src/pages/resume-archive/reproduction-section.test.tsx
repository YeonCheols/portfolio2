import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ReproductionRecord } from "../../types";

import { ReproductionSection } from "./reproduction-section";

const jsonResponse = (body: unknown, status = 200) =>
  ({ ok: status < 400, status, json: async () => body }) as Response;

const archiveKey = {
  environment: "development",
  subjectHash: "subj-a",
  generationId: "gen-1",
  attemptId: "att-1",
} as const;

const completed: ReproductionRecord = {
  reproductionId: "rep-1",
  createdAt: "2026-11-04T02:00:00.000Z",
  source: { kind: "revision", revisionId: "rev-1" },
  action: "pdf",
  status: "completed",
  validation: { claims: 3, gaps: 0, conflicts: 0, uncertain: 1, issues: [] },
  pdf: { byteLength: 1234 },
};

describe("ReproductionSection", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("고른 수정본으로 PDF를 재현하고 검증 수치와 내려받기 링크를 보여준다", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        jsonResponse({ ok: true, record: completed, pdfBase64: "JVBERi0=" }),
      );
    vi.stubGlobal("fetch", fetchMock);
    const onRecorded = vi.fn();
    const user = userEvent.setup();
    render(
      <ReproductionSection
        archiveKey={archiveKey}
        revisions={[{ revisionId: "rev-1" }]}
        history={[]}
        onRecorded={onRecorded}
      />,
    );

    await user.click(screen.getByRole("button", { name: "재현 원본" }));
    await user.click(screen.getByRole("option", { name: "수정본 rev-1" }));
    await user.click(screen.getByRole("button", { name: "PDF 재현" }));

    const result = await screen.findByRole("status");
    expect(result.textContent).toContain("재현을 완료했습니다");
    expect(result.textContent).toContain("문장 3");
    expect(result.textContent).toContain("확인 필요 1");
    expect(
      screen.getByRole("link", { name: "PDF 내려받기" }).getAttribute("href"),
    ).toBe("data:application/pdf;base64,JVBERi0=");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({
      source: { kind: "revision", revisionId: "rev-1" },
      action: "pdf",
    });
    expect(onRecorded).toHaveBeenCalledTimes(1);
  });

  it("실패 단계와 코드를 보여주고 중복 실행 거절은 안내하며 진행 중에는 다시 누를 수 없다", async () => {
    let resolve!: (response: Response) => void;
    const fetchMock = vi
      .fn()
      .mockReturnValueOnce(new Promise<Response>((r) => (resolve = r)))
      .mockResolvedValueOnce(
        jsonResponse({ ok: false, code: "REPRODUCTION_IN_PROGRESS" }, 409),
      );
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(
      <ReproductionSection
        archiveKey={archiveKey}
        revisions={[]}
        history={[]}
        onRecorded={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "검증 재현" }));
    const validate = screen.getByRole("button", { name: "검증 재현" });
    const pdf = screen.getByRole("button", { name: "PDF 재현" });
    expect((validate as HTMLButtonElement).disabled).toBe(true);
    expect((pdf as HTMLButtonElement).disabled).toBe(true);
    await user.click(validate);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    resolve(
      jsonResponse({
        ok: true,
        record: {
          ...completed,
          source: { kind: "original" },
          action: "validate",
          status: "failed",
          failedStage: "validation",
          errorCode: "MODEL_REJECTED",
          validation: undefined,
          pdf: undefined,
        },
      }),
    );
    const result = await screen.findByRole("status");
    expect(result.textContent).toContain("재현에 실패했습니다");
    expect(result.textContent).toContain("validation");
    expect(result.textContent).toContain("MODEL_REJECTED");

    await user.click(screen.getByRole("button", { name: "PDF 재현" }));
    expect((await screen.findByRole("alert")).textContent).toContain(
      "이미 같은 재현이 실행 중입니다.",
    );
  });

  it("이전 재현 기록을 원본 종류와 결과로 나열한다", () => {
    render(
      <ReproductionSection
        archiveKey={archiveKey}
        revisions={[{ revisionId: "rev-1" }]}
        history={[
          completed,
          {
            ...completed,
            reproductionId: "rep-0",
            source: { kind: "original" },
            action: "validate",
            status: "failed",
            failedStage: "validation",
            errorCode: "MODEL_REJECTED",
          },
        ]}
        onRecorded={vi.fn()}
      />,
    );

    const history = screen.getByRole("region", { name: "재현 기록" });
    expect(history.textContent).toContain("수정본 rev-1");
    expect(history.textContent).toContain("원본");
    expect(history.textContent).toContain("MODEL_REJECTED");
  });

  it("PDF가 커서 본문이 생략되면 내려받기 링크 대신 크기와 안내를 보여준다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({
          ok: true,
          record: { ...completed, pdf: { byteLength: 6 * 1024 * 1024 } },
          pdfOmitted: true,
        }),
      ),
    );
    const user = userEvent.setup();
    render(
      <ReproductionSection
        archiveKey={archiveKey}
        revisions={[]}
        history={[]}
        onRecorded={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "PDF 재현" }));

    const result = await screen.findByRole("status");
    expect(result.textContent).toContain("재현을 완료했습니다");
    expect(result.textContent).toContain(
      "PDF가 커서 내려받기를 제공하지 않습니다. (6144KB)",
    );
    expect(screen.queryByRole("link", { name: "PDF 내려받기" })).toBeNull();
  });
});
