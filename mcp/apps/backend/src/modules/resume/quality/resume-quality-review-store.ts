import { createHash, randomUUID } from "node:crypto";

import type { ArchiveKey } from "@mcp/modules/resume/archive/resume-debug-archive-reader";
import {
  archiveDirectory,
  createResumeDebugArchiveReader,
} from "@mcp/modules/resume/archive/resume-debug-archive-reader";
import type { ArchiveWriteStorage } from "@mcp/modules/resume/archive/resume-debug-archive-writer";
import type { QualityEvaluationRun } from "@mcp/modules/quality-evaluation/evaluation-contract";
import type { ResumeQualityReview } from "@mcp/modules/resume/quality/apply-resume-quality-reviews";

export type ResumeQualityReviewStorage = ArchiveWriteStorage;

type ReviewIdentity = Pick<
  QualityEvaluationRun,
  "evaluationId" | "caseSetVersion" | "policyVersion" | "inputRef" | "outputRef"
>;

export class ResumeQualityReviewError extends Error {
  constructor(
    public readonly code:
      | "QUALITY_CASE_NOT_REVIEWABLE"
      | "QUALITY_REVIEW_NOT_FOUND"
      | "QUALITY_REVIEW_UNAVAILABLE"
      | "QUALITY_REVIEW_STORAGE_FAILED",
  ) {
    super(code);
    this.name = "ResumeQualityReviewError";
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isReview = (value: unknown): value is ResumeQualityReview => {
  if (!isRecord(value)) return false;
  return (
    typeof value.reviewId === "string" &&
    typeof value.evaluationId === "string" &&
    typeof value.caseSetVersion === "string" &&
    typeof value.policyVersion === "string" &&
    typeof value.inputRef === "string" &&
    typeof value.outputRef === "string" &&
    typeof value.caseId === "string" &&
    (value.decision === "pass" || value.decision === "fail") &&
    typeof value.reviewedAt === "string" &&
    /^[a-f0-9]{64}$/.test(String(value.reviewerHash))
  );
};

const asIdentity = (value: unknown): ReviewIdentity | null => {
  if (!isRecord(value)) return null;
  const fields = [
    "evaluationId",
    "caseSetVersion",
    "policyVersion",
    "inputRef",
    "outputRef",
  ] as const;
  if (fields.some((field) => typeof value[field] !== "string")) return null;
  return {
    evaluationId: value.evaluationId as string,
    caseSetVersion: value.caseSetVersion as string,
    policyVersion: value.policyVersion as string,
    inputRef: value.inputRef as string,
    outputRef: value.outputRef as string,
  };
};

const subjectHashOf = (subject: string): string =>
  createHash("sha256").update(subject).digest("hex");

const generationDirectory = (key: ArchiveKey): string => {
  const attemptDirectory = archiveDirectory(key);
  return attemptDirectory.slice(0, attemptDirectory.lastIndexOf("/"));
};

const reviewDirectory = (directory: string, evaluationId: string): string => {
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(evaluationId))
    throw new ResumeQualityReviewError("QUALITY_CASE_NOT_REVIEWABLE");
  return `${directory}/quality-reviews/${evaluationId}`;
};

export const createResumeQualityReviewStore = (
  storage: ResumeQualityReviewStorage,
) => {
  const reader = createResumeDebugArchiveReader(storage);

  const readReviews = async (
    directory: string,
    identity: ReviewIdentity,
  ): Promise<ResumeQualityReview[]> => {
    const entries = await storage.listObjects(directory, {
      limit: 500,
      offset: 0,
    });
    const latestByCase = new Map<string, ResumeQualityReview>();
    for (const entry of entries) {
      if (entry.kind !== "file" || !entry.name.endsWith(".json")) continue;
      const value = await storage.getJson(`${directory}/${entry.name}`);
      if (!isReview(value))
        throw new ResumeQualityReviewError("QUALITY_REVIEW_STORAGE_FAILED");
      if (
        value.evaluationId !== identity.evaluationId ||
        value.caseSetVersion !== identity.caseSetVersion ||
        value.policyVersion !== identity.policyVersion ||
        value.inputRef !== identity.inputRef ||
        value.outputRef !== identity.outputRef
      )
        continue;
      const previous = latestByCase.get(value.caseId);
      if (
        !previous ||
        value.reviewedAt > previous.reviewedAt ||
        (value.reviewedAt === previous.reviewedAt &&
          value.reviewId > previous.reviewId)
      )
        latestByCase.set(value.caseId, value);
    }
    return [...latestByCase.values()];
  };

  return {
    load: async (input: {
      environment: string;
      subject: string;
      generationId: string;
      evaluation: QualityEvaluationRun;
    }): Promise<ResumeQualityReview[]> => {
      if (
        !input.subject.trim() ||
        !/^[A-Za-z0-9_-]{1,128}$/.test(input.generationId)
      )
        return [];
      const root = `debug/resume/${input.environment}/${subjectHashOf(input.subject)}/${input.generationId}`;
      const directory = reviewDirectory(root, input.evaluation.evaluationId);
      const identity = asIdentity(input.evaluation);
      if (!identity) return [];
      return readReviews(directory, identity);
    },

    list: async (
      key: ArchiveKey,
      evaluationId: string,
    ): Promise<ResumeQualityReview[]> => {
      const detail = await reader.get(key);
      const latest = isRecord(detail.latest) ? detail.latest : {};
      const evaluationValue = latest.qualityEvaluation;
      if (!isRecord(evaluationValue) || !isRecord(evaluationValue.run))
        throw new ResumeQualityReviewError("QUALITY_REVIEW_NOT_FOUND");
      const identity = asIdentity(evaluationValue.run);
      if (!identity || identity.evaluationId !== evaluationId)
        throw new ResumeQualityReviewError("QUALITY_REVIEW_NOT_FOUND");
      const directory = reviewDirectory(generationDirectory(key), evaluationId);
      return readReviews(directory, identity);
    },

    save: async (
      key: ArchiveKey,
      input: {
        evaluationId: string;
        caseId: string;
        decision: "pass" | "fail";
        reviewer: string;
      },
    ): Promise<ResumeQualityReview> => {
      const detail = await reader.get(key);
      const latest = isRecord(detail.latest) ? detail.latest : {};
      const evaluationValue = latest.qualityEvaluation;
      if (
        !isRecord(evaluationValue) ||
        !isRecord(evaluationValue.run) ||
        !Array.isArray(evaluationValue.run.cases)
      )
        throw new ResumeQualityReviewError("QUALITY_REVIEW_NOT_FOUND");
      const identity = asIdentity(evaluationValue.run);
      const targetCase = evaluationValue.run.cases.find(
        (item: unknown) => isRecord(item) && item.caseId === input.caseId,
      );
      if (
        !identity ||
        identity.evaluationId !== input.evaluationId ||
        !input.reviewer.trim() ||
        !targetCase ||
        !isRecord(targetCase) ||
        targetCase.decision !== "needs_review"
      )
        throw new ResumeQualityReviewError("QUALITY_CASE_NOT_REVIEWABLE");

      const directory = reviewDirectory(
        generationDirectory(key),
        input.evaluationId,
      );
      const previous = (await readReviews(directory, identity)).find(
        (item) => item.caseId === input.caseId,
      );
      const now = Date.now();
      const previousTime = previous ? Date.parse(previous.reviewedAt) : NaN;
      const reviewedAt = new Date(
        Number.isFinite(previousTime) && now <= previousTime
          ? previousTime + 1
          : now,
      ).toISOString();
      const review: ResumeQualityReview = {
        reviewId: randomUUID(),
        ...identity,
        caseId: input.caseId,
        decision: input.decision,
        reviewedAt,
        reviewerHash: subjectHashOf(input.reviewer),
      };
      const caseHash = createHash("sha256").update(review.caseId).digest("hex");
      await storage.putJson(
        `${directory}/${caseHash}-${review.reviewId}.json`,
        review,
      );
      return review;
    },
  };
};
