import {
  checkResumeDraft,
  type CheckedDraft,
  type CheckedDraftClaim,
  type DraftClaim,
  type DraftValidationIssueCode,
  type ResumeSelectionNode,
} from "@mcp/resume/output/checkResumeDraft";

const normalize = (value: string): string =>
  value.normalize("NFC").replace(/\s+/g, " ").trim();

const sourceText = (source: ResumeSelectionNode): string =>
  [source.text, ...source.children.map(sourceText)].filter(Boolean).join("\n");

const numericFacts = (text: string): string[] =>
  text.match(/\d+(?:[.,]\d+)*(?:%|퍼센트|년|개월|월|일|명|만|억)?/g) ?? [];

const validationCode = (
  claim: CheckedDraftClaim,
): DraftValidationIssueCode | undefined => {
  if (!hasEvidence(claim)) return "INVALID_SOURCE_EVIDENCE";
  const facts = new Set(
    numericFacts((claim.evidence ?? []).map((item) => item.quote).join("\n")),
  );
  if (numericFacts(claim.text).some((fact) => !facts.has(fact))) {
    return "UNSUPPORTED_NUMERIC_FACT";
  }
  return undefined;
};

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

// 인용·수치의 일치는 문장 전체의 의미가 원문과 같다는 증명이 아닙니다.
export const checkResumeEvidence = (
  selection: readonly ResumeSelectionNode[],
  claims: readonly DraftClaim[],
): CheckedDraft => {
  const checked = checkResumeDraft(selection, claims);
  const accepted = checked.claims.filter((claim) => !validationCode(claim));
  const rejected = checked.claims.flatMap((claim) => {
    const code = validationCode(claim);
    return code ? [{ claim, code }] : [];
  });
  return {
    ...checked,
    claims: accepted,
    gaps: [
      ...checked.gaps,
      ...rejected.map(({ claim: { text, sourceIds, formItem, evidence } }) => ({
        text,
        sourceIds,
        ...(formItem ? { formItem } : {}),
        evidence,
      })),
    ],
    validationIssues: [
      ...checked.validationIssues,
      ...rejected.map(({ claim, code }) => ({
        code,
        sourceIds: claim.sourceIds,
      })),
    ],
  };
};
