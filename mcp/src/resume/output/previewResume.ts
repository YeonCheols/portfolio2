import type { ResumeModel, ResumeXmlNode } from "../model/resumeModel";

const linesOf = (node: ResumeXmlNode): string[] => {
  const lines = node.text.trim() ? [node.text.trim()] : [];
  node.children.forEach((child) => {
    lines.push(...linesOf(child));
  });
  return lines;
};

export const previewResume = (resume: ResumeModel): string =>
  Object.entries(resume.sections)
    .flatMap(([sectionName, nodes]) => [
      sectionName,
      ...nodes.flatMap((node) => linesOf(node)),
    ])
    .join("\n");
