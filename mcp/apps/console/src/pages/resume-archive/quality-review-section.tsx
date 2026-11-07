import { useEffect, useState } from "react";

import { LoadingSpinner } from "../../shared/ui/loading-spinner";
import { listQualityReviews, saveQualityReview } from "./api/archive-api";
import type {
  ArchiveKey,
  ResumeQualityEvaluation,
  ResumeQualityReview,
} from "../../types";

type QualityReviewSectionProps = {
  archiveKey: ArchiveKey;
  evaluation: ResumeQualityEvaluation;
};

const decisionLabel = (decision: "pass" | "fail") =>
  decision === "pass" ? "통과 판정 완료" : "문제 발견 판정 완료";

export const QualityReviewSection = ({
  archiveKey,
  evaluation,
}: QualityReviewSectionProps) => {
  const [reviews, setReviews] = useState<ResumeQualityReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingCase, setSavingCase] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const currentReviews = new Map(
    reviews.map((review) => [review.caseId, review]),
  );
  const unresolved = evaluation.run.cases.filter(
    ({ decision }) => decision === "needs_review",
  );
  const blockingCases = evaluation.aggregates.reduce(
    (total, aggregate) => total + aggregate.blockingCases,
    0,
  );

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    listQualityReviews(archiveKey, evaluation.run.evaluationId)
      .then((items) => {
        if (active) setReviews(items);
      })
      .catch(() => {
        if (active) setError("저장된 품질 판정을 불러오지 못했습니다.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [archiveKey, evaluation.run.evaluationId]);

  const decide = async (caseId: string, decision: "pass" | "fail") => {
    if (savingCase) return;
    setSavingCase(caseId);
    setError(null);
    try {
      const review = await saveQualityReview(archiveKey, {
        evaluationId: evaluation.run.evaluationId,
        caseId,
        decision,
      });
      setReviews((current) => [
        ...current.filter((item) => item.caseId !== caseId),
        review,
      ]);
    } catch {
      setError("품질 판정을 저장하지 못했습니다.");
    } finally {
      setSavingCase(null);
    }
  };

  return (
    <section
      aria-label="품질 검토"
      className="mt-4 rounded-2xl border border-slate-200 bg-white p-5"
    >
      <h2 className="text-sm font-bold">품질 검토</h2>
      <p className="mt-1 text-xs text-slate-500">
        이 평가에 남은 검토 항목을 확인해 판정하면 같은 생성 ID의 PDF 변환에
        적용됩니다. 차단 건수 {blockingCases}건입니다.
      </p>
      {loading && (
        <LoadingSpinner
          label="저장된 판정을 불러오는 중입니다."
          className="mt-3"
        />
      )}
      {!loading && unresolved.length === 0 && (
        <p className="mt-3 text-sm text-slate-600">
          새로 검토할 항목이 없습니다.
        </p>
      )}
      <ul className="mt-3 grid gap-3">
        {unresolved.map((item) => {
          const review = currentReviews.get(item.caseId);
          const saving = savingCase === item.caseId;
          return (
            <li
              key={item.caseId}
              className="rounded-xl border border-slate-200 p-4"
            >
              <p className="font-mono text-xs text-slate-700">{item.caseId}</p>
              <p className="mt-1 text-xs text-slate-500">
                지표 {item.metricId}
                {item.reasonCode ? ` · ${item.reasonCode}` : ""}
              </p>
              {review && (
                <p role="status" className="mt-2 text-sm font-bold">
                  {decisionLabel(review.decision)}
                </p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={Boolean(savingCase)}
                  onClick={() => void decide(item.caseId, "pass")}
                  className="min-h-10 rounded-lg border border-green-300 px-4 text-xs font-bold text-green-800 disabled:cursor-not-allowed disabled:text-slate-400"
                >
                  {saving ? "저장 중" : review ? "통과로 변경" : "검토 통과"}
                </button>
                <button
                  type="button"
                  disabled={Boolean(savingCase)}
                  onClick={() => void decide(item.caseId, "fail")}
                  className="min-h-10 rounded-lg border border-red-300 px-4 text-xs font-bold text-red-800 disabled:cursor-not-allowed disabled:text-slate-400"
                >
                  {review ? "문제 발견으로 변경" : "문제 발견"}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {error}
        </p>
      )}
    </section>
  );
};
