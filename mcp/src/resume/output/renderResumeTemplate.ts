import type { ResumeModel, ResumeXmlNode } from "@mcp/resume/model/resumeModel";

const isSimpleValue = (node: ResumeXmlNode): boolean =>
  node.children.length === 0 && node.text.trim() !== "";

const childLines = (children: readonly ResumeXmlNode[]): string[] => {
  const lines: string[] = [];
  let index = 0;

  while (index < children.length) {
    const child = children[index];
    if (!isSimpleValue(child)) {
      lines.push(...labeledLines(child));
      index += 1;
      continue;
    }

    const values = [child.text];
    let next = index + 1;
    while (
      next < children.length &&
      isSimpleValue(children[next]) &&
      children[next].name === child.name
    ) {
      values.push(children[next].text);
      next += 1;
    }

    if (values.length > 1) {
      lines.push(child.name, ...values.map((value) => `- ${value}`));
    } else {
      lines.push(`${child.name} ${values[0]}`);
    }
    index = next;
  }

  return lines;
};

const labeledLines = (node: ResumeXmlNode): string[] => {
  if (isSimpleValue(node)) return [`${node.name} ${node.text}`];

  const lines = node.text ? [`${node.name} ${node.text}`] : [];
  lines.push(...childLines(node.children));
  return lines;
};

export const renderResumeTemplate = (
  resume: ResumeModel,
  template: string,
): string =>
  [
    template,
    ...Object.entries(resume.sections).flatMap(([sectionName, nodes]) => [
      sectionName,
      ...nodes.flatMap((node) => labeledLines(node)),
    ]),
  ].join("\n");
