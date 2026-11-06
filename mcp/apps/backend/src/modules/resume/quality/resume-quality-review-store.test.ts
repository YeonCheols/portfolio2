import { createHash } from "node:crypto";

import {
  createFakeArchiveStorage,
  failedAttemptObjects,
  validResponse,
} from "@mcp/modules/resume/testing/fake-archive-storage";
import { createResumeQualityReviewStore } from "@mcp/modules/resume/quality/resume-quality-review-store";

const subject = "admin-session-subject";
const subjectHash = createHash("sha256").update(subject).digest("hex");
const key = {
  environment: "development",
  subjectHash,
  generationId: "gen-1",
  attemptId: "att-1",
};

const evaluation = {
  run: {
    schemaVersion: 1,
    evaluationId: "gen-1-pdf-quality",
    evaluatedAt: "2026-11-06T00:00:00.000Z",
    domain: "resume",
    contractVersion: "1",
    caseSetVersion: "resume-quality-population-v1",
    policyVersion: "resume-quality-policy-v1",
    inputRef: "gen-1",
    outputRef: "gen-1-pdf",
    cases: [
      {
        metricId: "pdf-layout",
        ruleId: "pdf-page-layout",
        stage: "pdf",
        caseId: "pdf-page/1",
        unit: "page_layout_check",
        decision: "needs_review",
        blocking: true,
        evidence: [{ kind: "pdf_page", reference: "gen-1-pdf/page/1" }],
      },
      {
        metricId: "required-fact-preservation",
        ruleId: "source-fact-preserved",
        stage: "pdf",
        caseId: "source-fact/profile/name",
        unit: "source_fact",
        decision: "fail",
        blocking: true,
        evidence: [{ kind: "source_fact", reference: "profile-1" }],
      },
    ],
  },
  aggregates: [],
};

const setup = () => {
  const initial = Object.fromEntries(
    Object.entries(failedAttemptObjects(validResponse)).map(([path, value]) => [
      path.replace("/subj-a/", `/${subjectHash}/`),
      value,
    ]),
  );
  const base = createFakeArchiveStorage({
    ...initial,
    [`debug/resume/development/${subjectHash}/gen-1/att-1/005-quality_evaluation.json`]:
      {
        qualityEvaluation: evaluation,
      },
  });
  return { storage: base, reviews: createResumeQualityReviewStore(base) };
};

describe("createResumeQualityReviewStore", () => {
  it("평가에 있는 미해결 케이스의 판정을 저장하고 생성 평가에서 다시 읽는다", async () => {
    const { storage, reviews } = setup();
    const saved = await reviews.save(key, {
      evaluationId: "gen-1-pdf-quality",
      caseId: "pdf-page/1",
      decision: "pass",
      reviewer: "admin-1",
    });
    const corrected = await reviews.save(key, {
      evaluationId: "gen-1-pdf-quality",
      caseId: "pdf-page/1",
      decision: "fail",
      reviewer: "admin-2",
    });
    const loaded = await reviews.load({
      environment: key.environment,
      subject,
      generationId: key.generationId,
      evaluation: evaluation.run,
    });

    expect(saved).toMatchObject({ caseId: "pdf-page/1", decision: "pass" });
    expect(saved.reviewId).toMatch(/^[a-f0-9-]{36}$/);
    expect(corrected).toMatchObject({ caseId: "pdf-page/1", decision: "fail" });
    expect(loaded).toEqual([corrected]);
    const savedRecords = [...storage.objects.entries()].filter(([path]) =>
      path.includes("/quality-reviews/gen-1-pdf-quality/"),
    );
    expect(savedRecords).toHaveLength(2);
    expect(savedRecords.map(([, record]) => record.body)).toEqual(
      expect.arrayContaining([saved, corrected]),
    );
    expect(JSON.stringify([...storage.objects.values()])).not.toContain(
      "admin-session-subject",
    );
  });

  it("실패하거나 모르는 케이스의 판정 저장을 거부한다", async () => {
    const { reviews } = setup();

    await expect(
      reviews.save(key, {
        evaluationId: "gen-1-pdf-quality",
        caseId: "source-fact/profile/name",
        decision: "pass",
        reviewer: "admin-1",
      }),
    ).rejects.toMatchObject({ code: "QUALITY_CASE_NOT_REVIEWABLE" });
    await expect(
      reviews.save(key, {
        evaluationId: "gen-1-pdf-quality",
        caseId: "unknown-case",
        decision: "pass",
        reviewer: "admin-1",
      }),
    ).rejects.toMatchObject({ code: "QUALITY_CASE_NOT_REVIEWABLE" });
  });

  it("다른 평가 버전이나 입력에 저장된 판정을 적용 대상으로 내보내지 않는다", async () => {
    const { reviews } = setup();
    await reviews.save(key, {
      evaluationId: "gen-1-pdf-quality",
      caseId: "pdf-page/1",
      decision: "pass",
      reviewer: "admin-1",
    });

    await expect(
      reviews.load({
        environment: key.environment,
        subject,
        generationId: key.generationId,
        evaluation: { ...evaluation.run, outputRef: "different-output" },
      }),
    ).resolves.toEqual([]);
  });
});
