import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ResumeQualityEvaluation } from "../../types";

import { QualityReviewSection } from "./quality-review-section";

const key = {
  environment: "development",
  subjectHash: "subj-a",
  generationId: "gen-1",
  attemptId: "att-1",
} as const;

const evaluation: ResumeQualityEvaluation = {
  run: {
    evaluationId: "gen-1-pdf-quality",
    caseSetVersion: "resume-quality-population-v1",
    policyVersion: "resume-quality-policy-v1",
    inputRef: "gen-1",
    outputRef: "gen-1-pdf",
    cases: [
      {
        metricId: "pdf-layout",
        caseId: "pdf-page/1",
        decision: "needs_review",
        blocking: true,
        reasonCode: "PDF_PAGE_LAYOUT_REQUIRES_VISUAL_REVIEW",
        evidence: [{ kind: "pdf_page", reference: "gen-1-pdf/page/1" }],
      },
    ],
  },
  aggregates: [
    {
      metricId: "pdf-layout",
      confirmedRate: null,
      denominator: 1,
      blockingCases: 1,
    },
  ],
};

const response = (body: Record<string, unknown>) =>
  ({
    ok: true,
    status: 200,
    json: async () => ({ ok: true, ...body }),
  }) as Response;

describe("QualityReviewSection", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("저장된 판정을 조회하는 동안 로딩 표시를 보여준다", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockReturnValue(new Promise<Response>(() => {})),
    );

    render(<QualityReviewSection archiveKey={key} evaluation={evaluation} />);

    expect(screen.getByRole("status").textContent).toContain("불러오는 중");
    expect(screen.getByTestId("loading-spinner")).toBeTruthy();
  });

  it("관리자가 검토 통과를 저장하면 판정 결과를 표시한다", async () => {
    const review = {
      reviewId: "00000000-0000-4000-8000-000000000001",
      evaluationId: "gen-1-pdf-quality",
      caseSetVersion: "resume-quality-population-v1",
      policyVersion: "resume-quality-policy-v1",
      inputRef: "gen-1",
      outputRef: "gen-1-pdf",
      caseId: "pdf-page/1",
      decision: "pass" as const,
      reviewedAt: "2026-11-06T01:00:00.000Z",
      reviewerHash: "a".repeat(64),
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response({ items: [] }))
      .mockResolvedValueOnce(response({ review }));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<QualityReviewSection archiveKey={key} evaluation={evaluation} />);

    await user.click(await screen.findByRole("button", { name: "검토 통과" }));

    expect(await screen.findByText("통과 판정 완료")).toBeTruthy();
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toMatchObject({
      evaluationId: "gen-1-pdf-quality",
      caseId: "pdf-page/1",
      decision: "pass",
    });
  });

  it("저장된 판정을 다시 확인해 다른 결정으로 수정한다", async () => {
    const existing = {
      reviewId: "00000000-0000-4000-8000-000000000001",
      evaluationId: "gen-1-pdf-quality",
      caseSetVersion: "resume-quality-population-v1",
      policyVersion: "resume-quality-policy-v1",
      inputRef: "gen-1",
      outputRef: "gen-1-pdf",
      caseId: "pdf-page/1",
      decision: "pass" as const,
      reviewedAt: "2026-11-06T01:00:00.000Z",
      reviewerHash: "a".repeat(64),
    };
    const updated = { ...existing, decision: "fail" as const };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response({ items: [existing] }))
      .mockResolvedValueOnce(response({ review: updated }));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<QualityReviewSection archiveKey={key} evaluation={evaluation} />);

    await user.click(
      await screen.findByRole("button", { name: "문제 발견으로 변경" }),
    );

    expect(await screen.findByText("문제 발견 판정 완료")).toBeTruthy();
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toMatchObject({
      caseId: "pdf-page/1",
      decision: "fail",
    });
  });
});
