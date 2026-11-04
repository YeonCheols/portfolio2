import {
  checkResumeDraft,
  type CheckedDraft,
  type CheckedDraftClaim,
  type DraftClaim,
  type ResumeSelectionNode,
} from "@mcp/resume/output/checkResumeDraft";

const normalize = (value: string): string =>
  value.normalize("NFC").replace(/\s+/g, " ").trim();

const sourceText = (source: ResumeSelectionNode): string =>
  [source.text, ...source.children.map(sourceText)].filter(Boolean).join("\n");

const hasEvidence = (claim: CheckedDraftClaim): boolean => {
  const evidence = claim.evidence;
  if (!evidence?.length) return false;
  return (
    claim.sourceIds.every((id) =>
      evidence.some((item) => item.sourceId === id),
    ) &&
    evidence.every((item) => {
      const source = claim.sources.find((node) => node.id === item.sourceId);
      return (
        source !== undefined &&
        normalize(item.quote) !== "" &&
        normalize(sourceText(source)).includes(normalize(item.quote))
      );
    })
  );
};

// 인용 구절·출처의 일치만 검증하며 문장 전체의 의미를 증명한 상태로 취급하지 않습니다.
export const checkResumeEvidence = (
  selection: readonly ResumeSelectionNode[],
  claims: readonly DraftClaim[],
): CheckedDraft => {
  const checked = checkResumeDraft(selection, claims);
  const accepted = checked.claims.filter(hasEvidence);
  const rejected = checked.claims.filter((claim) => !hasEvidence(claim));
  return {
    ...checked,
    claims: accepted,
    gaps: [
      ...checked.gaps,
      ...rejected.map(({ text, sourceIds, formItem, evidence }) => ({
        text,
        sourceIds,
        ...(formItem ? { formItem } : {}),
        evidence,
      })),
    ],
    validationIssues: [
      ...checked.validationIssues,
      ...rejected.map((claim) => ({
        code: "INVALID_SOURCE_EVIDENCE" as const,
        sourceIds: claim.sourceIds,
      })),
    ],
  };
};
