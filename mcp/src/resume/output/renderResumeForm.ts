import type { ResumeModel, ResumeXmlNode } from "../model/resumeModel";

const sectionLabels: Record<string, string> = {
  profile: "프로필",
  educationHistory: "학력",
  employmentHistory: "경력",
  projects: "프로젝트",
};

const fieldLabels: Record<string, string> = {
  name: "이름",
  headline: "소개",
  email: "이메일",
  phone: "전화",
  gender: "성별",
  birthYear: "출생연도",
  reportedAge: "나이",
  address: "주소",
  reportedYears: "경력 연수",
  reportedMonths: "경력 개월",
  reportedText: "총 경력",
  institution: "학교",
  level: "학력 구분",
  completion: "졸업 구분",
  value: "학점",
  scale: "학점 기준",
  organization: "회사",
  position: "직급",
  reportedDuration: "재직 기간",
  employmentStatus: "재직 상태",
  summary: "요약",
  responsibility: "담당 업무",
  category: "직무",
  title: "프로젝트",
  role: "역할",
  domain: "담당 영역",
  link: "링크",
  alias: "별칭",
  memberCount: "인원",
  periodNote: "기간 참고",
};

const textOf = (node: ResumeXmlNode | undefined): string =>
  node?.text.trim() ?? "";

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

const fieldLabel = (
  name: string,
  ancestors: readonly string[],
): string | undefined => {
  if (name === "department") {
    return ancestors.includes("education") ? "학과" : "부서";
  }

  return fieldLabels[name];
};

const isSimpleValue = (
  node: ResumeXmlNode,
  ancestors: readonly string[],
): boolean =>
  Boolean(
    fieldLabel(node.name, ancestors) &&
      textOf(node) &&
      node.children.length === 0,
  );

const childLines = (
  children: readonly ResumeXmlNode[],
  ancestors: readonly string[],
): string[] => {
  const lines: string[] = [];
  let index = 0;

  while (index < children.length) {
    const child = children[index];
    if (!isSimpleValue(child, ancestors)) {
      lines.push(...linesOf(child, ancestors));
      index += 1;
      continue;
    }

    const label = fieldLabel(child.name, ancestors) ?? "";
    const values = [textOf(child)];
    let next = index + 1;
    while (
      next < children.length &&
      isSimpleValue(children[next], ancestors) &&
      fieldLabel(children[next].name, ancestors) === label
    ) {
      values.push(textOf(children[next]));
      next += 1;
    }

    if (values.length > 1) {
      lines.push(label, ...values.map((value) => `- ${value}`));
    } else {
      lines.push(`${label} ${values[0]}`);
    }
    index = next;
  }

  return lines;
};

const linesOf = (
  node: ResumeXmlNode,
  ancestors: readonly string[],
): string[] => {
  if (node.name === "period") {
    const start = textOf(node.children.find((child) => child.name === "start"));
    const end = textOf(node.children.find((child) => child.name === "end"));
    const period = [start, end].filter(Boolean).join(" ~ ");
    return period ? [`기간 ${period}`] : [];
  }

  const label = fieldLabel(node.name, ancestors);
  const text = textOf(node);
  const own = label && text ? [`${label} ${text}`] : [];
  return [...own, ...childLines(node.children, [...ancestors, node.name])];
};

const sectionLines = (nodes: readonly ResumeXmlNode[]): string[] =>
  nodes.flatMap((node) => linesOf(node, []));

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
  template: string,
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

const templateSections = (template: string): string[] => {
  if (template === "경력 중심형") return ["employmentHistory", "projects"];
  if (template === "프로젝트 중심형") {
    return ["projects", "employmentHistory"];
  }
  return ["profile", "educationHistory", "employmentHistory", "projects"];
};

export const renderResumeForm = (
  resume: ResumeModel,
  template: string,
): string => {
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
  const lines = [template];

  templateSections(template).forEach((sectionName) => {
    const nodes = resume.sections[sectionName] ?? [];
    const visible = visibleNodes(
      template,
      sectionName,
      nodes,
      employmentIds,
      linkedEmploymentIds,
    );
    const content = sectionLines(visible);
    const heading = sectionLabels[sectionName];
    if (heading && content.length > 0) lines.push(heading, ...content);
  });

  return lines.join("\n");
};
