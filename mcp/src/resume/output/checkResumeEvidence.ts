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
  (
    text.match(
      /\d{4}(?:-(?:0[1-9]|1[0-2])(?:-(?:0[1-9]|[12]\d|3[01]))?|년\s*(?:0?[1-9]|1[0-2])월(?:\s*(?:0?[1-9]|[12]\d|3[01])일)?)|\d+(?:[.,]\d+)*(?:\s*(?:만|억))?(?:\s*(?:%|퍼센트|년|개월|월|일|명))?/g,
    ) ?? []
  ).map((fact) =>
    fact
      .replace(
        /^(\d{4})년\s*(\d{1,2})월(?:\s*(\d{1,2})일)?$/,
        (_, year: string, month: string, day?: string) =>
          `${year}-${month.padStart(2, "0")}${day ? `-${day.padStart(2, "0")}` : ""}`,
      )
      .replace(/\s+/g, "")
      .replace(/^(\d+)(만|억)?명$/, (_, value: string, scale?: string) => {
        const zeros =
          scale === "만" ? "0000" : scale === "억" ? "00000000" : "";
        return `${`${value}${zeros}`.replace(/^0+(?=\d)/, "")}명`;
      }),
  );

// 단위 없는 인용은 해당 구조화 필드의 전체 값일 때만 표시 단위를 인정합니다.
const structuredNumericFacts = (
  source: ResumeSelectionNode,
  quote: string,
): string[] => {
  const value = normalize(quote);
  const facts: string[] = [];
  if (normalize(source.text) === value) {
    if (source.name === "reportedYears" && /^\d+$/.test(value)) {
      facts.push(`${value}년`);
    }
    if (source.name === "reportedMonths" && /^\d+$/.test(value)) {
      facts.push(`${value}개월`);
    }
    if (
      (source.unit === "person" ||
        (source.name === "memberCount" && !source.unit)) &&
      /^\d+$/.test(value)
    ) {
      facts.push(...numericFacts(`${value}명`));
    }
    if (
      ["birthYear", "start", "end"].includes(source.name) &&
      /^\d{4}$/.test(value)
    ) {
      facts.push(`${value}년`);
    }
  }
  return [
    ...facts,
    ...source.children.flatMap((child) => structuredNumericFacts(child, quote)),
  ];
};

const evidenceNumericFacts = (claim: CheckedDraftClaim): Set<string> =>
  new Set(
    (claim.evidence ?? []).flatMap((item) => {
      const source = claim.sources.find((node) => node.id === item.sourceId);
      return [
        ...numericFacts(item.quote),
        ...(source ? structuredNumericFacts(source, item.quote) : []),
      ];
    }),
  );

const validationCode = (
  claim: CheckedDraftClaim,
): DraftValidationIssueCode | undefined => {
  if (!hasEvidence(claim)) return "INVALID_SOURCE_EVIDENCE";
  const facts = evidenceNumericFacts(claim);
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
    diagnostics: rejected.map(({ claim, code }) => {
      const expected = [...evidenceNumericFacts(claim)];
      const actual = numericFacts(claim.text);
      return {
        claimIndex: claims.findIndex(
          (item) =>
            item.text === claim.text &&
            item.formItem === claim.formItem &&
            item.sourceIds.join("\0") === claim.sourceIds.join("\0"),
        ),
        code,
        text: claim.text,
        sourceIds: claim.sourceIds,
        ...(claim.formItem ? { formItem: claim.formItem } : {}),
        evidence: claim.evidence,
        ...(code === "UNSUPPORTED_NUMERIC_FACT"
          ? {
              numeric: {
                expected,
                actual,
                unsupported: actual.filter((fact) => !expected.includes(fact)),
              },
            }
          : {}),
      };
    }),
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
