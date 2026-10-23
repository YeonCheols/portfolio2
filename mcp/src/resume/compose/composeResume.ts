import type { ResumeModel, ResumeXmlNode } from "@mcp/resume/model/resumeModel";

export type ResumeSelection = {
  elementIds: readonly string[];
  sectionOrder: readonly string[];
};

const pruneNode = (
  node: ResumeXmlNode,
  selectedIds: ReadonlySet<string>,
): ResumeXmlNode | null => {
  const id = node.attributes.id;
  if (id && !selectedIds.has(id)) return null;

  const children = node.children.flatMap((child) => {
    const pruned = pruneNode(child, selectedIds);
    return pruned ? [pruned] : [];
  });

  return {
    ...node,
    children,
    content: children,
  };
};

export const composeResume = (
  resume: ResumeModel,
  selection: ResumeSelection,
): ResumeModel => {
  const selectedIds = new Set(selection.elementIds);
  const sections: Record<string, readonly ResumeXmlNode[]> = {};

  selection.sectionOrder.forEach((sectionName) => {
    const nodes = resume.sections[sectionName] ?? [];
    sections[sectionName] = nodes.flatMap((node) => {
      const pruned = pruneNode(node, selectedIds);
      return pruned ? [pruned] : [];
    });
  });

  return {
    ...resume,
    sections,
  };
};
