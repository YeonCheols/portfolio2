import type { ResumeModel, ResumeXmlNode } from "@mcp/resume/model/resumeModel";
import type { ResumeTemplate } from "@mcp/resume/model/resumeTemplate";

const findNamed = (
  nodes: readonly ResumeXmlNode[],
  name: string,
): ResumeXmlNode[] =>
  nodes.flatMap((node) => [
    ...(node.name === name ? [node] : []),
    ...findNamed(node.children, name),
  ]);

const employmentRefOf = (node: ResumeXmlNode): string | undefined =>
  node.references.employmentRef?.[0] ?? node.attributes.employmentRef;

const recordsNamed = (
  nodes: readonly ResumeXmlNode[],
  name: string,
  include: (node: ResumeXmlNode) => boolean,
): ResumeXmlNode[] =>
  nodes.flatMap((node) => {
    if (node.name === name) return include(node) ? [node] : [];
    return findNamed([node], name).filter(include);
  });

const visibleNodes = (
  template: ResumeTemplate,
  sectionName: string,
  nodes: readonly ResumeXmlNode[],
  employmentIds: ReadonlySet<string>,
  linkedEmploymentIds: ReadonlySet<string>,
): readonly ResumeXmlNode[] => {
  if (template === "경력 중심형" && sectionName === "projects") {
    return recordsNamed(nodes, "project", (project) =>
      employmentIds.has(employmentRefOf(project) ?? ""),
    );
  }

  if (template === "프로젝트 중심형" && sectionName === "employmentHistory") {
    return recordsNamed(nodes, "employment", (employment) =>
      linkedEmploymentIds.has(employment.attributes.id ?? ""),
    );
  }

  return nodes;
};

const templateSectionNames = (template: ResumeTemplate): string[] => {
  if (template === "경력 중심형") return ["employmentHistory", "projects"];
  if (template === "프로젝트 중심형") {
    return ["projects", "employmentHistory"];
  }
  return ["profile", "educationHistory", "employmentHistory", "projects"];
};

export const selectTemplateSections = (
  resume: ResumeModel,
  template: ResumeTemplate,
): { name: string; nodes: readonly ResumeXmlNode[] }[] => {
  const employmentIds = new Set(
    findNamed(resume.sections.employmentHistory ?? [], "employment")
      .map((node) => node.attributes.id)
      .filter((id): id is string => Boolean(id)),
  );
  const linkedEmploymentIds = new Set(
    findNamed(resume.sections.projects ?? [], "project")
      .map((node) => employmentRefOf(node))
      .filter((id): id is string => Boolean(id)),
  );

  return templateSectionNames(template).map((name) => ({
    name,
    nodes: visibleNodes(
      template,
      name,
      resume.sections[name] ?? [],
      employmentIds,
      linkedEmploymentIds,
    ),
  }));
};
