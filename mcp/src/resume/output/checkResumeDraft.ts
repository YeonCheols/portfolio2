export type ResumeSelectionNode = {
  id?: string;
  section: string;
  name: string;
  text: string;
  sourceRefs: readonly string[];
  visibility: string;
  children: readonly ResumeSelectionNode[];
};

export type DraftClaim = {
  text: string;
  sourceIds: readonly string[];
};

export type CheckedDraftClaim = {
  text: string;
  sourceIds: readonly string[];
  sources: readonly ResumeSelectionNode[];
};

export type CheckedDraft = {
  claims: readonly CheckedDraftClaim[];
  gaps: readonly DraftClaim[];
  conflicts: readonly { sourceId: string; texts: readonly string[] }[];
  uncertain: readonly { id: string; visibility: string }[];
};

const findById = (
  nodes: readonly ResumeSelectionNode[],
  id: string,
): ResumeSelectionNode | undefined => {
  for (const node of nodes) {
    if (node.id === id) return node;
    const child = findById(node.children, id);
    if (child) return child;
  }
  return undefined;
};

const hasText = (node: ResumeSelectionNode): boolean =>
  node.text !== "" || node.children.some(hasText);

const sourcesOf = (
  selection: readonly ResumeSelectionNode[],
  claim: DraftClaim,
): ResumeSelectionNode[] | undefined => {
  if (claim.sourceIds.length === 0) return undefined;
  const sources = claim.sourceIds.map((id) => findById(selection, id));
  if (sources.some((source) => !source || !hasText(source))) return undefined;
  return sources.filter((source): source is ResumeSelectionNode =>
    Boolean(source),
  );
};

const textsBySourceId = (claims: readonly DraftClaim[]) => {
  const texts = new Map<string, string[]>();
  claims.forEach((claim) => {
    claim.sourceIds.forEach((id) => {
      const current = texts.get(id) ?? [];
      if (!current.includes(claim.text)) current.push(claim.text);
      texts.set(id, current);
    });
  });
  return texts;
};

export const checkResumeDraft = (
  selection: readonly ResumeSelectionNode[],
  claims: readonly DraftClaim[],
): CheckedDraft => {
  const texts = textsBySourceId(claims);
  const conflicts = [...texts.entries()]
    .filter(([, values]) => values.length > 1)
    .map(([sourceId, values]) => ({ sourceId, texts: values }));
  const conflictIds = new Set(conflicts.map((conflict) => conflict.sourceId));
  const accepted: CheckedDraftClaim[] = [];
  const gaps: DraftClaim[] = [];

  claims.forEach((claim) => {
    if (claim.sourceIds.some((id) => conflictIds.has(id))) return;
    const sources = sourcesOf(selection, claim);
    if (!sources) {
      gaps.push({ text: claim.text, sourceIds: [...claim.sourceIds] });
      return;
    }
    accepted.push({
      text: claim.text,
      sourceIds: [...claim.sourceIds],
      sources,
    });
  });

  const uncertain: { id: string; visibility: string }[] = [];
  const seen = new Set<string>();
  accepted.forEach((claim) => {
    claim.sources.forEach((source) => {
      if (source.visibility !== "" || !source.id || seen.has(source.id)) return;
      seen.add(source.id);
      uncertain.push({ id: source.id, visibility: "" });
    });
  });

  return { claims: accepted, gaps, conflicts, uncertain };
};

export const checkedResumeText = (draft: CheckedDraft): string =>
  draft.claims.map((claim) => claim.text).join("\n");
