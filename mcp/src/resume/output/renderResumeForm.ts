import type { ResumeModel, ResumeXmlNode } from "@mcp/resume/model/resumeModel";
import type { ResumeTemplate } from "@mcp/resume/model/resumeTemplate";
import { selectTemplateSections } from "@mcp/resume/output/selectTemplateSections";

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

export const renderResumeFormSections = (
  resume: ResumeModel,
  template: ResumeTemplate,
): { section: string; text: string }[] => {
  const sections: { section: string; text: string }[] = [];

  selectTemplateSections(resume, template).forEach(({ name, nodes }) => {
    const content = sectionLines(nodes);
    const heading = sectionLabels[name];
    if (!heading || content.length === 0) return;
    sections.push({ section: name, text: [heading, ...content].join("\n") });
  });

  return sections;
};

export const renderResumeForm = (
  resume: ResumeModel,
  template: ResumeTemplate,
): string => {
  const sections = renderResumeFormSections(resume, template).map(
    (section) => section.text,
  );
  return [template, ...sections].join("\n");
};
