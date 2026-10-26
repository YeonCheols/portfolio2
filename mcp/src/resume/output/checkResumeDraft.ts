export type ResumeSelectionNode = {
  id?: string;
  section: string;
  name: string;
  text: string;
  sourceRefs: readonly string[];
  employmentRef?: string;
  projectRef?: string;
  workItemRef?: string;
  visibility: string;
  children: readonly ResumeSelectionNode[];
};

export type DraftClaim = {
  text: string;
  sourceIds: readonly string[];
  formItem?: string;
};

export type CheckedDraftClaim = {
  text: string;
  sourceIds: readonly string[];
  sources: readonly ResumeSelectionNode[];
  formItem?: string;
};

export type CheckedDraft = {
  claims: readonly CheckedDraftClaim[];
  gaps: readonly DraftClaim[];
  conflicts: readonly {
    sourceId: string;
    texts: readonly string[];
    formItem?: string;
  }[];
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

const hasFormItem = (
  nodes: readonly ResumeSelectionNode[],
  formItem: string,
): boolean =>
  nodes.some(
    (node) =>
      ((node.name === formItem ||
        (node.name === "title" && node.text === formItem)) &&
        hasText(node)) ||
      hasFormItem(node.children, formItem),
  );

const projectIdOf = (
  nodes: readonly ResumeSelectionNode[],
  id: string,
  parentProjectId?: string,
): string | undefined => {
  for (const node of nodes) {
    const projectId =
      node.section === "projects" && node.name === "project"
        ? node.id
        : parentProjectId;
    if (node.id === id) return projectId;
    const childProjectId = projectIdOf(node.children, id, projectId);
    if (childProjectId) return childProjectId;
  }

  return undefined;
};

const hasSingleProjectScope = (
  selection: readonly ResumeSelectionNode[],
  claim: DraftClaim,
  sources: readonly ResumeSelectionNode[],
): boolean => {
  if (!sources.some((source) => source.section === "projects")) return true;

  const projectIds = claim.sourceIds.map((id) => projectIdOf(selection, id));
  const identifiedProjectIds = projectIds.filter((id): id is string =>
    Boolean(id),
  );
  if (identifiedProjectIds.length === 0) return true;

  return (
    identifiedProjectIds.length === projectIds.length &&
    new Set(identifiedProjectIds).size === 1
  );
};

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

const claimScopeKey = (sourceId: string, formItem?: string): string =>
  `${sourceId}\u0000${formItem ?? ""}`;

const textsBySourceId = (claims: readonly DraftClaim[]) => {
  const texts = new Map<
    string,
    { sourceId: string; formItem?: string; texts: string[] }
  >();
  claims.forEach((claim) => {
    if (claim.text.trim() === "") return;

    claim.sourceIds.forEach((id) => {
      const key = claimScopeKey(id, claim.formItem);
      const current = texts.get(key) ?? {
        sourceId: id,
        ...(claim.formItem ? { formItem: claim.formItem } : {}),
        texts: [],
      };
      if (!current.texts.includes(claim.text)) current.texts.push(claim.text);
      texts.set(key, current);
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
    .filter(([, { texts: values }]) => values.length > 1)
    .map(([, { sourceId, formItem, texts: values }]) => ({
      sourceId,
      texts: values,
      ...(formItem ? { formItem } : {}),
    }));
  const conflictIds = new Set(
    [...texts.entries()]
      .filter(([, { texts: values }]) => values.length > 1)
      .map(([key]) => key),
  );
  const accepted: CheckedDraftClaim[] = [];
  const gaps: DraftClaim[] = [];

  claims.forEach((claim) => {
    if (claim.text.trim() === "") {
      gaps.push({
        text: claim.text,
        sourceIds: [...claim.sourceIds],
        ...(claim.formItem ? { formItem: claim.formItem } : {}),
      });
      return;
    }

    if (
      claim.sourceIds.some((id) =>
        conflictIds.has(claimScopeKey(id, claim.formItem)),
      )
    ) {
      return;
    }
    const sources = sourcesOf(selection, claim);
    if (
      !sources ||
      !hasSingleProjectScope(selection, claim, sources) ||
      (claim.formItem && !hasFormItem(sources, claim.formItem))
    ) {
      gaps.push({
        text: claim.text,
        sourceIds: [...claim.sourceIds],
        ...(claim.formItem ? { formItem: claim.formItem } : {}),
      });
      return;
    }
    accepted.push({
      text: claim.text,
      sourceIds: [...claim.sourceIds],
      sources,
      ...(claim.formItem ? { formItem: claim.formItem } : {}),
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
