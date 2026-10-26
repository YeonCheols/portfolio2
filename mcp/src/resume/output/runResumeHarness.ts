import {
  checkResumeDraft,
  type CheckedDraft,
  type DraftClaim,
  type ResumeSelectionNode,
} from "@mcp/resume/output/checkResumeDraft";

export const resumeWriterPersona = [
  "너는 이력서 전문 작성자다.",
  "선택한 XML 원소의 원문만 근거로 원소를 해석하고, 그 해석으로 이력서 문장을 다시 쓴다.",
  "원문을 그대로 이어 붙이지 않고 이력서 문장으로 재구성한다.",
  "XML에 없는 경력, 성과, 기술은 만들지 않는다.",
  "각 문장에는 근거 원소 id를 붙인다.",
  "원문이 비어 있거나 근거 id가 없으면 그 내용은 누락으로 남긴다.",
  "같은 원소에 서로 다른 단정이 있으면 하나를 고르지 않고 충돌로 남긴다.",
  "공개 여부가 비어 있으면 공개로 단정하지 않는다.",
  "비공개 원문을 지우거나 공개로 바꾸지 않는다.",
  "응답은 요청된 JSON만 반환한다.",
].join("\n");

export type ResumeModelRequest = {
  persona: string;
  prompt: string;
};

export type ResumeModelClient = {
  generate: (input: ResumeModelRequest) => Promise<string>;
};

export type GeneratedResume = CheckedDraft & {
  resume: string;
};

const resumeSectionOrder: {
  title: string;
  sources: readonly string[];
}[] = [
  { title: "프로필", sources: ["profile"] },
  { title: "학력", sources: ["educationHistory"] },
  { title: "경력", sources: ["employmentHistory", "projects"] },
  {
    title: "인턴·대외활동",
    sources: ["activities", "contributions", "initiatives"],
  },
  { title: "교육", sources: ["trainingHistory"] },
  { title: "자격증", sources: ["certifications"] },
  { title: "자기소개서", sources: ["personalStatements"] },
  { title: "포트폴리오", sources: ["portfolioReferences"] },
  { title: "병역사항", sources: ["employmentEligibility"] },
  { title: "희망근무조건", sources: ["employmentPreferences"] },
];

export const generatedResumeSectionNames = [
  ...resumeSectionOrder.flatMap(({ sources }) => sources),
];

export const generatedResumePromptTitle = (
  sourceSection: string,
): string | undefined => {
  if (sourceSection === "employmentPreferences") {
    return "희망근무조건\n지원분야";
  }

  return resumeSectionOrder.find(({ sources }) =>
    sources.includes(sourceSection),
  )?.title;
};

const sectionOfClaim = (
  claim: CheckedDraft["claims"][number],
): string | undefined => {
  const eligibilitySources = claim.sources.filter(
    (source) => source.section === "employmentEligibility",
  );
  if (eligibilitySources.length > 0) {
    return eligibilitySources.every(
      (source) => source.name === "militaryService",
    )
      ? "병역사항"
      : undefined;
  }

  if (
    claim.sources.some(
      (source) =>
        source.section === "employmentPreferences" &&
        (["role", "roles"].includes(source.name) ||
          ["role", "roles"].includes(claim.formItem ?? "")),
    )
  ) {
    return "지원분야";
  }

  const matchingSections = resumeSectionOrder.flatMap(({ title, sources }) =>
    claim.sources.some((source) => sources.includes(source.section))
      ? [title]
      : [],
  );
  if (matchingSections.length > 0) return matchingSections[0];
  return undefined;
};

const profileItemLabels: Readonly<Record<string, string>> = {
  name: "이름",
  gender: "성별",
  birthYear: "출생연도",
  reportedAge: "나이",
  phone: "휴대폰",
  email: "이메일",
  address: "주소",
  headline: "한줄 소개",
};

const projectItemLabels: Readonly<Record<string, string>> = {
  team: "팀/역할",
  role: "팀/역할",
  summary: "전체 내용",
  technicalStructure: "기술적 구조",
  responsibility: "프로젝트 내용",
  technologyRefs: "사용 기술",
  use: "사용 기술",
  period: "기간",
  link: "사이트 URL",
  projectApproach: "프로젝트 진행 방식",
  domains: "담당 개발 도메인",
  domain: "담당 개발 도메인",
};

type ProjectContext = {
  id: string;
  title: string;
  order: number;
};

const projectContextsOf = (
  selection: readonly ResumeSelectionNode[],
): {
  bySourceId: ReadonlyMap<string, ProjectContext>;
  projects: ProjectContext[];
} => {
  const bySourceId = new Map<string, ProjectContext>();
  const projects = new Map<string, ProjectContext>();

  const visit = (
    nodes: readonly ResumeSelectionNode[],
    currentProject?: ProjectContext,
  ) => {
    nodes.forEach((node) => {
      let project = currentProject;
      if (node.section === "projects" && node.name === "project" && node.id) {
        const title =
          node.children.find((child) => child.name === "title")?.text.trim() ??
          "";
        if (title) {
          project = projects.get(node.id) ?? {
            id: node.id,
            title,
            order: projects.size,
          };
          projects.set(project.id, project);
        }
      }

      if (project && node.id) bySourceId.set(node.id, project);
      visit(node.children, project);
    });
  };

  visit(selection);
  return { bySourceId, projects: [...projects.values()] };
};

const projectOfClaim = (
  claim: CheckedDraft["claims"][number],
  projectContexts: ReadonlyMap<string, ProjectContext>,
): ProjectContext | undefined => {
  const projects = claim.sourceIds.map((id) => projectContexts.get(id));
  if (projects.length === 0 || projects.some((project) => !project)) {
    return undefined;
  }

  const projectIds = new Set(projects.map((project) => project?.id));
  if (projectIds.size !== 1) return undefined;
  return projects[0];
};

const itemLabelOf = (
  claim: CheckedDraft["claims"][number],
  section: string,
): string | undefined => {
  const item = claim.formItem;
  if (!item) return undefined;

  if (section === "프로필") return profileItemLabels[item];
  if (section === "경력") {
    if (claim.sources.some((source) => source.section === "projects")) {
      return projectItemLabels[item];
    }
    return undefined;
  }
  if (
    section === "자기소개서" &&
    ["자기소개", "성격의 장단점", "목표 및 포부"].includes(item)
  ) {
    return item;
  }

  return undefined;
};

const itemOrderBySection: Readonly<Record<string, readonly string[]>> = {
  프로필: [
    "이름",
    "성별",
    "출생연도",
    "나이",
    "휴대폰",
    "이메일",
    "주소",
    "한줄 소개",
  ],
  경력: [
    "팀/역할",
    "전체 내용",
    "기술적 구조",
    "프로젝트 내용",
    "사용 기술",
    "기간",
    "사이트 URL",
    "프로젝트 진행 방식",
    "담당 개발 도메인",
  ],
  자기소개서: ["자기소개", "성격의 장단점", "목표 및 포부"],
};

const itemLinesOf = (
  title: string,
  claims: CheckedDraft["claims"],
): string[] => {
  const itemGroups = new Map<string, string[]>();
  const ungrouped: string[] = [];

  claims.forEach((claim) => {
    const itemLabel = itemLabelOf(claim, title);
    if (!itemLabel) {
      ungrouped.push(claim.text);
      return;
    }

    const current = itemGroups.get(itemLabel) ?? [];
    current.push(claim.text);
    itemGroups.set(itemLabel, current);
  });

  const itemOrder = itemOrderBySection[title] ?? [];
  const orderedItemGroups = [...itemGroups.entries()].sort(
    ([first], [second]) => itemOrder.indexOf(first) - itemOrder.indexOf(second),
  );
  return [
    ...orderedItemGroups.flatMap(([item, texts]) => [item, ...texts]),
    ...ungrouped,
  ];
};

const linesOfSection = (
  title: string,
  claims: CheckedDraft["claims"],
  projectContexts: ReadonlyMap<string, ProjectContext>,
  projectOrder: ReadonlyMap<string, number>,
): string[] => {
  const otherClaims: CheckedDraft["claims"][number][] = [];
  const projectGroups = new Map<
    string,
    { project: ProjectContext; claims: CheckedDraft["claims"][number][] }
  >();

  claims.forEach((claim) => {
    const projectSource = claim.sources.some(
      (source) => source.section === "projects",
    );
    const project =
      title === "경력" && projectSource
        ? projectOfClaim(claim, projectContexts)
        : undefined;
    if (!project) {
      otherClaims.push(claim);
      return;
    }

    const group = projectGroups.get(project.id) ?? { project, claims: [] };
    group.claims.push(claim);
    projectGroups.set(project.id, group);
  });

  const projectLines = [...projectGroups.values()]
    .sort(
      (first, second) =>
        (projectOrder.get(first.project.id) ?? first.project.order) -
        (projectOrder.get(second.project.id) ?? second.project.order),
    )
    .flatMap(({ project, claims: projectClaims }) => {
      const lines = itemLinesOf(title, projectClaims);
      return lines.length > 0 ? [project.title, ...lines] : [];
    });

  return [title, ...itemLinesOf(title, otherClaims), ...projectLines];
};

export const assembleGeneratedResume = (
  claims: CheckedDraft["claims"],
  selection: readonly ResumeSelectionNode[],
): string => {
  const { bySourceId, projects } = projectContextsOf(selection);
  const projectOrder = new Map(
    projects.map((project) => [project.id, project.order]),
  );

  return resumeSectionOrder
    .map(({ title }) => title)
    .concat("지원분야")
    .flatMap((title) => {
      const sectionClaims = claims.filter(
        (claim) => sectionOfClaim(claim) === title,
      );
      return sectionClaims.length > 0
        ? linesOfSection(title, sectionClaims, bySourceId, projectOrder)
        : [];
    })
    .join("\n");
};

const isClaim = (value: unknown): value is DraftClaim => {
  if (typeof value !== "object" || value === null) return false;
  if (!("text" in value) || !("sourceIds" in value)) return false;
  const { text, sourceIds } = value;
  return (
    typeof text === "string" &&
    Array.isArray(sourceIds) &&
    sourceIds.every((id) => typeof id === "string") &&
    (!("formItem" in value) || typeof value.formItem === "string")
  );
};

const hasInterpretation = (text: string): boolean => {
  try {
    const parsed: unknown = JSON.parse(text);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !("elements" in parsed)
    ) {
      return false;
    }
    const { elements } = parsed;
    return Array.isArray(elements) && elements.length > 0;
  } catch {
    return false;
  }
};

const parseClaims = (text: string): DraftClaim[] => {
  try {
    const parsed: unknown = JSON.parse(text);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !("claims" in parsed)
    ) {
      return [];
    }
    const { claims } = parsed;
    if (!Array.isArray(claims) || !claims.every(isClaim)) return [];
    return claims;
  } catch {
    return [];
  }
};

export type ResumeFormSection = {
  section: string;
  text: string;
};

export const interpretResumePrompt = (
  selection: readonly ResumeSelectionNode[],
  form?: string,
) =>
  `선택한 원소를 해석하고 JSON만 반환한다. 형식은 {"elements":[{"id":"","interpretation":""}]} 이다.\n${form ? `${form}\n` : ""}${JSON.stringify(selection)}`;

type ResumeFormItemStructure = {
  id?: string;
  section: string;
  name: string;
  text?: string;
  children: ResumeFormItemStructure[];
};

const formItemStructure = (
  node: ResumeSelectionNode,
): ResumeFormItemStructure => ({
  ...(node.id ? { id: node.id } : {}),
  section: node.section,
  name: node.name,
  ...(node.section === "personalStatements" && node.name === "title"
    ? { text: node.text }
    : {}),
  children: node.children.map(formItemStructure),
});

export const rewriteResumePrompt = (
  interpretation: string,
  selection?: readonly ResumeSelectionNode[],
) =>
  `해석을 이력서 문장으로 재작성하고 JSON만 반환한다. 형식은 {"claims":[{"text":"","sourceIds":[""],"formItem":""}]} 이다. formItem은 문장이 하나의 양식 항목에 해당할 때 선택 원소 트리의 정확한 항목 이름을 사용한다. 자기소개서 문장은 확인된 제목 값을 formItem으로 사용한다. 여러 항목을 한 문장으로 합치거나 원문에서 항목을 확인할 수 없으면 formItem을 생략한다. 서로 다른 프로젝트를 한 claim으로 합치지 않고 각 프로젝트의 제목과 원소를 구분한다.\n${JSON.stringify(
    {
      interpretation,
      ...(selection ? { selection: selection.map(formItemStructure) } : {}),
    },
  )}`;

export const continueResumeGeneration = (
  selection: readonly ResumeSelectionNode[],
  interpretation: string,
) => {
  if (!hasInterpretation(interpretation)) {
    const checked = checkResumeDraft(selection, []);
    return {
      ...checked,
      step: "done" as const,
      resume: assembleGeneratedResume(checked.claims, selection),
    };
  }
  return {
    persona: resumeWriterPersona,
    step: "rewrite" as const,
    prompt: rewriteResumePrompt(interpretation, selection),
  };
};

const mergeChecked = (
  parts: readonly CheckedDraft[],
  selection: readonly ResumeSelectionNode[],
): GeneratedResume => {
  const checked = {
    claims: parts.flatMap((part) => part.claims),
    gaps: parts.flatMap((part) => part.gaps),
    conflicts: parts.flatMap((part) => part.conflicts),
    uncertain: parts.flatMap((part) => part.uncertain),
  };
  return {
    ...checked,
    resume: assembleGeneratedResume(checked.claims, selection),
  };
};

export const runResumeHarness = async (
  selection: readonly ResumeSelectionNode[],
  client: ResumeModelClient,
  forms?: readonly ResumeFormSection[],
): Promise<GeneratedResume> => {
  const groups = forms
    ? forms.flatMap((form) => {
        const nodes = selection.filter((node) => node.section === form.section);
        return nodes.length === 0 ? [] : [{ text: form.text, nodes }];
      })
    : [{ text: "", nodes: selection }];
  const checked: CheckedDraft[] = [];

  for (const group of groups) {
    const interpretation = await client.generate({
      persona: resumeWriterPersona,
      prompt: interpretResumePrompt(group.nodes, group.text),
    });
    if (!hasInterpretation(interpretation)) continue;
    const rewritten = await client.generate({
      persona: resumeWriterPersona,
      prompt: rewriteResumePrompt(interpretation, group.nodes),
    });
    checked.push(checkResumeDraft(selection, parseClaims(rewritten)));
  }

  return mergeChecked(checked, selection);
};

export const generateResume = async (
  selection: readonly ResumeSelectionNode[],
  input: {
    claims?: readonly DraftClaim[];
    interpretation?: string;
    model?: ResumeModelClient;
    forms?: readonly ResumeFormSection[];
  },
) => {
  if (input.claims !== undefined) {
    const checked = checkResumeDraft(selection, input.claims);
    return {
      ...checked,
      step: "done" as const,
      resume: assembleGeneratedResume(checked.claims, selection),
    };
  }
  if (input.interpretation !== undefined) {
    return continueResumeGeneration(selection, input.interpretation);
  }
  if (input.model) {
    return runResumeHarness(selection, input.model, input.forms);
  }
  return {
    persona: resumeWriterPersona,
    step: "interpret" as const,
    prompt: interpretResumePrompt(
      selection,
      input.forms?.map((form) => form.text).join("\n"),
    ),
    selection,
  };
};
