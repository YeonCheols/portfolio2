import type PDFDocumentType from "pdfkit";
import path from "node:path";
import type {
  CheckedDraftClaim,
  ResumeSelectionNode,
} from "@mcp/resume/output/checkResumeDraft";

export type ResumePdfInput = {
  resume: string;
  claims: readonly CheckedDraftClaim[];
  selection: readonly ResumeSelectionNode[];
};

export type ResumePdfRecord = {
  id?: string;
  title: string;
  period: string;
  subtitle: string;
  details: { label: string; value: string }[];
  narratives: string[];
};

export type ResumePdfProject = ResumePdfRecord & {
  employmentRef?: string;
  workItems: ResumePdfWorkItem[];
};

export type ResumePdfWorkItem = {
  id?: string;
  title: string;
  descriptions: string[];
  outcomes: string[];
  narratives: string[];
};

export type ResumePdfEmployment = ResumePdfRecord & {
  organization: string;
  projects: ResumePdfProject[];
};

export type ResumePdfModel = {
  profile: {
    name: string;
    headline: string;
    details: { label: string; value: string }[];
  };
  summaryCards: { label: string; title: string; detail: string }[];
  technologies: string[];
  education: ResumePdfRecord[];
  employment: ResumePdfEmployment[];
  unassignedProjects: ResumePdfProject[];
  activities: ResumePdfRecord[];
  training: ResumePdfRecord[];
  certifications: ResumePdfRecord[];
  statements: ResumePdfRecord[];
  portfolio: ResumePdfRecord[];
  militaryService: string;
  preferences: { label: string; value: string }[];
};

const visibleText = (node: ResumeSelectionNode | undefined): string =>
  node?.visibility === "public" ? node.text.trim() : "";

const childrenOf = (
  node: ResumeSelectionNode | undefined,
  name: string,
): ResumeSelectionNode[] =>
  node?.children.filter((child) => child.name === name) ?? [];

const childOf = (
  node: ResumeSelectionNode | undefined,
  name: string,
): ResumeSelectionNode | undefined => childrenOf(node, name)[0];

const field = (node: ResumeSelectionNode, name: string): string => {
  if (node.visibility !== "public") return "";
  const value = childOf(node, name);
  if (!value || value.visibility !== "public") return "";
  const directText = visibleText(value);
  if (directText) return directText;

  const nestedText = (current: ResumeSelectionNode): string[] =>
    current.children.flatMap((child) => {
      if (child.visibility !== "public") return [];
      const text = visibleText(child);
      return text ? [text] : nestedText(child);
    });
  return [...new Set(nestedText(value))].join(" · ");
};

const periodOf = (node: ResumeSelectionNode): string => {
  const period = childOf(node, "period");
  const start = field(period ?? node, "start");
  const end = field(period ?? node, "end");
  return [start, end].filter(Boolean).join(" ~ ");
};

const descendantsHaveIds = (node: ResumeSelectionNode): Set<string> => {
  const ids = new Set<string>();
  const visit = (current: ResumeSelectionNode) => {
    if (current.id) ids.add(current.id);
    current.children.forEach(visit);
  };
  visit(node);
  return ids;
};

const claimsForNode = (
  node: ResumeSelectionNode,
  claims: readonly CheckedDraftClaim[],
): string[] => {
  const ids = descendantsHaveIds(node);
  if (node.visibility !== "public") return [];
  return [
    ...new Set(
      claims
        .filter((claim) => claim.sourceIds.some((id) => ids.has(id)))
        .filter(
          (claim) =>
            claim.sources.length > 0 &&
            claim.sources.every((source) => source.visibility === "public"),
        )
        .map((claim) => claim.text.trim())
        .filter(Boolean),
    ),
  ];
};

const recordOf = (
  node: ResumeSelectionNode,
  claims: readonly CheckedDraftClaim[],
  titleNames: readonly string[],
  detailNames: readonly [string, string][],
): ResumePdfRecord => ({
  ...(node.id ? { id: node.id } : {}),
  title: titleNames.map((name) => field(node, name)).find(Boolean) ?? "",
  period: periodOf(node),
  subtitle: [field(node, "position"), field(node, "department")]
    .filter(Boolean)
    .join(" · "),
  details: detailNames.flatMap(([name, label]) => {
    const value = field(node, name);
    return value ? [{ label, value }] : [];
  }),
  narratives: claimsForNode(node, claims),
});

const recordsOf = (
  selection: readonly ResumeSelectionNode[],
  section: string,
  name: string,
  claims: readonly CheckedDraftClaim[],
  titleNames: readonly string[],
  details: readonly [string, string][],
): ResumePdfRecord[] =>
  selection
    .filter(
      (node) =>
        node.visibility === "public" &&
        node.section === section &&
        node.name === name,
    )
    .map((node) => recordOf(node, claims, titleNames, details))
    .filter((record) => record.title || record.narratives.length > 0);

export const buildResumePdfModel = (input: ResumePdfInput): ResumePdfModel => {
  const { selection, claims } = input;
  const profile = selection.find(
    (node) => node.section === "profile" && node.name === "profile",
  );
  const education = recordsOf(
    selection,
    "educationHistory",
    "education",
    claims,
    ["institution"],
    [
      ["level", "학력 구분"],
      ["department", "학과"],
      ["completion", "졸업 구분"],
      ["grade", "학점"],
    ],
  );
  const employment = recordsOf(
    selection,
    "employmentHistory",
    "employment",
    claims,
    ["organization"],
    [
      ["position", "직급"],
      ["department", "부서"],
      ["reportedDuration", "재직 기간"],
      ["summary", "주요 업무"],
      ["responsibility", "담당 업무"],
    ],
  ).map((record) => ({
    ...record,
    organization: record.title,
    projects: [] as ResumePdfProject[],
  }));
  const projectDetailLabels: Record<string, string> = {
    summary: "전체 내용",
    responsibility: "프로젝트 내용",
    technicalStructure: "기술적 구조",
    projectApproach: "프로젝트 진행 방식",
  };
  const projects = selection
    .filter(
      (node) =>
        node.visibility === "public" &&
        node.section === "projects" &&
        node.name === "project",
    )
    .map(
      (node): ResumePdfProject => ({
        ...recordOf(
          node,
          claims,
          ["title"],
          [
            ["team", "팀/역할"],
            ["role", "역할"],
          ],
        ),
        ...(node.employmentRef ? { employmentRef: node.employmentRef } : {}),
        workItems: [],
        details: [
          ...recordOf(
            node,
            claims,
            ["title"],
            [
              ["team", "팀/역할"],
              ["role", "역할"],
            ],
          ).details,
          ...[
            "summary",
            "responsibility",
            "technicalStructure",
            "projectApproach",
          ].flatMap((name) => {
            const value = field(node, name);
            return value
              ? [
                  {
                    label: projectDetailLabels[name],
                    value,
                  },
                ]
              : [];
          }),
        ],
      }),
    );
  const projectsById = new Map(
    projects.flatMap((project) =>
      project.id ? [[project.id, project] as const] : [],
    ),
  );
  const outcomeDescriptions = new Map<string, string[]>();
  selection
    .filter(
      (node) =>
        node.visibility === "public" &&
        node.section === "outcomes" &&
        node.name === "outcome" &&
        node.workItemRef,
    )
    .forEach((outcome) => {
      const description = [
        field(outcome, "text"),
        field(outcome, "metric"),
        field(outcome, "measurementPeriod"),
        field(outcome, "attribution"),
      ]
        .filter(Boolean)
        .join(" · ");
      if (!description || !outcome.workItemRef) return;
      const descriptions = outcomeDescriptions.get(outcome.workItemRef) ?? [];
      descriptions.push(description);
      outcomeDescriptions.set(outcome.workItemRef, descriptions);
    });
  selection
    .filter(
      (node) =>
        node.visibility === "public" &&
        node.section === "workItems" &&
        node.name === "workItem",
    )
    .forEach((node) => {
      if (!node.projectRef) return;
      const project = projectsById.get(node.projectRef);
      if (!project) return;
      project.workItems.push({
        ...(node.id ? { id: node.id } : {}),
        title: field(node, "title"),
        descriptions: childrenOf(node, "text").map(visibleText).filter(Boolean),
        outcomes: node.id ? (outcomeDescriptions.get(node.id) ?? []) : [],
        narratives: claimsForNode(node, claims),
      });
    });
  const employmentById = new Map(
    employment.flatMap((record) =>
      record.id ? [[record.id, record] as const] : [],
    ),
  );
  const unassignedProjects = projects.filter((project) => {
    const parent = project.employmentRef
      ? employmentById.get(project.employmentRef)
      : undefined;
    if (parent) parent.projects.push(project);
    return !parent;
  });
  const technologies = selection
    .filter(
      (node) =>
        node.visibility === "public" &&
        node.section === "technologies" &&
        node.name === "technology",
    )
    .map((node) => field(node, "name"))
    .filter(Boolean);
  const activityNodes = selection.filter(
    (node) =>
      node.visibility === "public" &&
      ["activities", "contributions", "initiatives"].includes(node.section),
  );
  const activities = activityNodes.map((node) => ({
    ...recordOf(
      node,
      claims,
      ["organization", "title"],
      [["reportedDuration", "기간"]],
    ),
    narratives: [field(node, "text"), ...claimsForNode(node, claims)].filter(
      Boolean,
    ),
  }));
  const training = recordsOf(
    selection,
    "trainingHistory",
    "training",
    claims,
    ["title"],
    [
      ["institution", "기관"],
      ["reportedDuration", "기간"],
      ["topics", "교육 내용"],
    ],
  );
  const certifications = recordsOf(
    selection,
    "certifications",
    "certification",
    claims,
    ["name"],
    [
      ["issuer", "발급 기관"],
      ["issuedAt", "발급일"],
    ],
  );
  const statements = recordsOf(
    selection,
    "personalStatements",
    "statement",
    claims,
    ["title"],
    [],
  ).map((record, index) => ({
    ...record,
    narratives:
      record.narratives.length > 0
        ? record.narratives
        : [
            visibleText(
              fieldNode(
                selection,
                "personalStatements",
                "statement",
                index,
                "text",
              ),
            ),
          ].filter(Boolean),
  }));
  const portfolio = recordsOf(
    selection,
    "portfolioReferences",
    "portfolioReference",
    claims,
    ["value"],
    [],
  );
  const eligibility = selection.find(
    (node) =>
      node.visibility === "public" &&
      node.section === "employmentEligibility" &&
      node.name === "employmentEligibility",
  );
  const militaryService = field(eligibility ?? emptyNode, "militaryService");
  const preference = selection.find(
    (node) =>
      node.visibility === "public" &&
      node.section === "employmentPreferences" &&
      node.name === "employmentPreferences",
  );
  const preferences = [
    ["employmentType", "고용형태"],
    ["regions", "희망근무지"],
    ["salary", "희망연봉"],
    ["roles", "직무"],
    ["industries", "산업"],
  ].flatMap(([name, label]) => {
    const section = childOf(preference, name);
    const value = preferenceValue(section);
    return value ? [{ label, value }] : [];
  });
  const profileDetails = [
    ["gender", "성별"],
    ["birthYear", "출생연도"],
    ["reportedAge", "나이"],
    ["phone", "휴대폰"],
    ["email", "이메일"],
    ["address", "주소"],
  ].flatMap(([name, label]) => {
    const value = field(profile ?? emptyNode, name);
    return value ? [{ label, value }] : [];
  });
  const careerSummary = field(
    childOf(profile, "careerSummary") ?? emptyNode,
    "reportedText",
  );
  const summaryCards = [
    education[0]
      ? {
          label: "학력",
          title: education[0].title,
          detail: [
            field(
              selection.find((node) => node.id === education[0].id) ??
                emptyNode,
              "level",
            ),
            field(
              selection.find((node) => node.id === education[0].id) ??
                emptyNode,
              "completion",
            ),
          ]
            .filter(Boolean)
            .join(" · "),
        }
      : undefined,
    employment[0]
      ? {
          label: "경력",
          title: employment[0].title,
          detail:
            careerSummary ||
            employment[0].details.find((item) => item.label === "재직 기간")
              ?.value ||
            "",
        }
      : undefined,
    activities[0]
      ? {
          label: "인턴·대외활동 / 해외경험",
          title: activities[0].title,
          detail: activities[0].period,
        }
      : undefined,
    certifications[0]
      ? {
          label: "자격증 / 어학",
          title: certifications[0].title,
          detail:
            certifications[0].details.find((item) => item.label === "발급 기관")
              ?.value ?? "",
        }
      : undefined,
  ].filter((card): card is NonNullable<typeof card> => Boolean(card));

  return {
    profile: {
      name: field(profile ?? emptyNode, "name"),
      headline: field(profile ?? emptyNode, "headline"),
      details: profileDetails,
    },
    summaryCards,
    technologies,
    education,
    employment,
    unassignedProjects,
    activities,
    training,
    certifications,
    statements,
    portfolio,
    militaryService,
    preferences,
  };
};

const emptyNode: ResumeSelectionNode = {
  section: "",
  name: "",
  text: "",
  sourceRefs: [],
  visibility: "",
  children: [],
};

const fieldNode = (
  selection: readonly ResumeSelectionNode[],
  section: string,
  name: string,
  index: number,
  childName: string,
): ResumeSelectionNode | undefined =>
  selection
    .filter((node) => node.section === section && node.name === name)
    [index]?.children.find((child) => child.name === childName);

const preferenceValue = (node: ResumeSelectionNode | undefined): string => {
  if (!node || node.visibility !== "public") return "";
  if (node.children.length === 0) return node.text.trim();
  return node.children
    .flatMap((child) => {
      if (child.visibility !== "public") return [];
      const directText = child.text.trim();
      const named = childOf(child, "name");
      const values = [visibleText(named), directText].filter(Boolean);
      return values.length > 0 ? [values.join(" · ")] : [];
    })
    .join(", ");
};

const resumeFont = path.resolve(
  __dirname,
  "../../../fonts/NotoSansKR-Regular.otf",
);

export const resumePdfContinuationLabel = (
  sectionTitle: string,
  contextTitles: readonly string[] = [],
): string =>
  [sectionTitle, ...contextTitles].filter(Boolean).join(" · ") + " (계속)";

export const createResumePdf = (input: ResumePdfInput): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const PDFDocument = require("pdfkit") as typeof PDFDocumentType;
    const document = new PDFDocument({
      size: "A4",
      margins: { top: 38, right: 42, bottom: 40, left: 42 },
      info: { Title: "이력서", Author: "portfolio-resume" },
    });
    const model = buildResumePdfModel(input);
    const chunks: Buffer[] = [];
    document.on("data", (chunk: Buffer) => chunks.push(chunk));
    document.on("error", reject);
    document.on("end", () => resolve(Buffer.concat(chunks)));

    const pageWidth = document.page.width;
    const left = document.page.margins.left;
    const right = pageWidth - document.page.margins.right;
    const bottom = document.page.height - document.page.margins.bottom;
    const textWidth = right - left;
    let y = document.page.margins.top;
    let activeSectionTitle = "";
    let activeProjectTitle = "";
    let activeRecordTitle = "";
    let activeWorkItemTitle = "";

    const colors = {
      ink: "#17191c",
      muted: "#7b8088",
      blue: "#2376d2",
      border: "#dfe2e6",
      pale: "#f7f8fa",
      white: "#ffffff",
    };

    const splitToLines = (
      text: string,
      maxWidth: number,
      fontSize: number,
    ): string[] => {
      const lines: string[] = [];
      let line = "";
      let width = 0;

      for (const character of Array.from(text)) {
        document.font(resumeFont).fontSize(fontSize);
        const characterWidth = document.widthOfString(character);
        if (line !== "" && width + characterWidth > maxWidth) {
          lines.push(line);
          line = "";
          width = 0;
        }
        line += character;
        width += characterWidth;
      }

      if (line !== "") lines.push(line);
      return lines;
    };

    const ensureSpace = (height: number) => {
      if (y + height > bottom) {
        document.addPage();
        y = document.page.margins.top;
        if (activeSectionTitle) {
          const contextTitles = [
            activeProjectTitle || activeRecordTitle,
            activeWorkItemTitle,
          ].filter(Boolean);
          document
            .font(resumeFont)
            .fontSize(8)
            .fillColor(colors.muted)
            .text(
              resumePdfContinuationLabel(activeSectionTitle, contextTitles),
              left,
              y,
              { lineBreak: false },
            );
          y += 16;
        }
      }
    };

    const drawLinesAt = (
      text: string,
      x: number,
      top: number,
      width: number,
      fontSize: number,
      color: string,
      lineHeight = fontSize + 3.5,
    ): number => {
      const lines = splitToLines(text, width, fontSize);
      lines.forEach((line, index) => {
        document
          .font(resumeFont)
          .fontSize(fontSize)
          .fillColor(color)
          .text(line, x, top + index * lineHeight, { lineBreak: false });
      });
      return lines.length * lineHeight;
    };

    const writeLines = (
      text: string,
      x: number,
      width: number,
      fontSize: number,
      color: string,
      options: { lineHeight?: number; gapAfter?: number } = {},
    ) => {
      const lineHeight = options.lineHeight ?? fontSize + 3.5;
      splitToLines(text, width, fontSize).forEach((line) => {
        ensureSpace(lineHeight);
        drawLinesAt(line, x, y, width, fontSize, color, lineHeight);
        y += lineHeight;
      });
      y += options.gapAfter ?? 0;
    };

    const drawRule = (x = left, width = textWidth) => {
      document
        .moveTo(x, y)
        .lineTo(x + width, y)
        .lineWidth(0.7)
        .strokeColor(colors.border)
        .stroke();
    };

    const drawSectionTitle = (title: string, firstContentHeight = 44) => {
      ensureSpace(40 + firstContentHeight);
      activeSectionTitle = title;
      y += 8;
      document
        .font(resumeFont)
        .fontSize(14)
        .fillColor(colors.ink)
        .text(title, left, y, { lineBreak: false });
      y += 23;
      drawRule();
      y += 8;
    };

    const drawRecord = (
      record: ResumePdfRecord,
      options: { indent?: number; compact?: boolean } = {},
    ) => {
      const indent = options.indent ?? 0;
      const x = left + indent;
      const width = textWidth - indent;
      const dateWidth = options.compact ? 0 : 104;
      const bodyX = x + dateWidth + (dateWidth > 0 ? 14 : 0);
      const bodyWidth = width - dateWidth - (dateWidth > 0 ? 14 : 0);
      const headerHeight = options.compact ? 24 : 30;
      ensureSpace(headerHeight + 12);
      const startY = y;
      activeRecordTitle = record.title || record.subtitle;
      if (!options.compact && record.period) {
        drawLinesAt(record.period, x, startY, dateWidth, 8.5, colors.muted);
      }
      const title = record.title || record.subtitle;
      const titleHeight = drawLinesAt(
        title,
        bodyX,
        startY,
        bodyWidth,
        options.compact ? 10 : 11,
        colors.ink,
      );
      y = startY + Math.max(headerHeight, titleHeight) + 2;
      if (record.subtitle && record.subtitle !== title) {
        writeLines(record.subtitle, bodyX, bodyWidth, 8.5, colors.muted, {
          gapAfter: 2,
        });
      }
      record.details.forEach(({ label, value }) => {
        writeLines(`${label}  ${value}`, bodyX, bodyWidth, 8.7, colors.ink, {
          gapAfter: 1,
        });
      });
      record.narratives.forEach((text) => {
        writeLines(text, bodyX, bodyWidth, 8.7, colors.ink, {
          gapAfter: 3,
        });
      });
      y += 7;
      drawRule(x, width);
      y += 8;
      activeRecordTitle = "";
    };

    const drawSummaryCards = () => {
      if (model.summaryCards.length === 0) return;
      const gap = 7;
      const cardWidth = (textWidth - gap * 3) / 4;
      const cardHeight = 68;
      ensureSpace(cardHeight + 10);
      model.summaryCards.forEach((card, index) => {
        const x = left + index * (cardWidth + gap);
        document
          .roundedRect(x, y, cardWidth, cardHeight, 2)
          .fillAndStroke(colors.white, colors.border);
        const textX = x + 7;
        const textWidth = cardWidth - 14;
        const textY = y + 9;
        const labelHeight = drawLinesAt(
          card.label,
          textX,
          textY,
          textWidth,
          7.5,
          colors.muted,
        );
        const titleHeight = drawLinesAt(
          card.title,
          textX,
          textY + labelHeight + 2,
          textWidth,
          8.7,
          colors.ink,
        );
        drawLinesAt(
          card.detail,
          textX,
          textY + labelHeight + titleHeight + 4,
          textWidth,
          8,
          colors.blue,
        );
      });
      y += cardHeight + 10;
    };

    const drawTechnologyTags = () => {
      if (model.technologies.length === 0) return;
      const tagHeight = 20;
      const gap = 5;
      let x = left + 8;
      let rowY = y + 8;
      model.technologies.forEach((technology) => {
        document.font(resumeFont).fontSize(8.2);
        const tagWidth = document.widthOfString(technology) + 16;
        if (x + tagWidth > right - 8) {
          x = left + 8;
          rowY += tagHeight + gap;
        }
        document
          .roundedRect(x, rowY, tagWidth, tagHeight, 2)
          .fillAndStroke(colors.pale, colors.border);
        document
          .font(resumeFont)
          .fontSize(8.2)
          .fillColor(colors.ink)
          .text(technology, x + 8, rowY + 5, { lineBreak: false });
        x += tagWidth + gap;
      });
      y = rowY + tagHeight + 10;
    };

    const drawPreferences = () => {
      if (model.preferences.length === 0) return;
      const labelWidth = 112;
      model.preferences.forEach(({ label, value }) => {
        const lines = splitToLines(value, textWidth - labelWidth - 24, 9);
        const rowHeight = Math.max(34, lines.length * 13 + 18);
        ensureSpace(rowHeight);
        document
          .rect(left, y, textWidth, rowHeight)
          .fillAndStroke(colors.white, colors.border);
        document
          .rect(left, y, labelWidth, rowHeight)
          .fillAndStroke(colors.pale, colors.border);
        drawLinesAt(label, left + 10, y + 12, labelWidth - 20, 8.5, colors.ink);
        drawLinesAt(
          value,
          left + labelWidth + 12,
          y + 10,
          textWidth - labelWidth - 24,
          9,
          colors.ink,
          13,
        );
        y += rowHeight;
      });
      y += 8;
    };

    const drawProfile = () => {
      const title = model.profile.headline || model.profile.name || "이력서";
      const titleHeight = drawLinesAt(
        title,
        left,
        y,
        textWidth,
        18,
        colors.ink,
        23,
      );
      y += titleHeight + 14;
      const boxY = y;
      const nameWidth = 185;
      document
        .rect(left, boxY, textWidth, 74)
        .fillAndStroke(colors.white, colors.border);
      drawLinesAt(
        model.profile.name,
        left + 14,
        boxY + 15,
        nameWidth,
        14,
        colors.ink,
      );
      model.profile.details.forEach(({ label, value }, index) => {
        const column = index % 2;
        const row = Math.floor(index / 2);
        const x =
          left + nameWidth + 8 + column * ((textWidth - nameWidth - 22) / 2);
        const cellWidth = (textWidth - nameWidth - 22) / 2;
        const cellY = boxY + 12 + row * 17;
        document
          .font(resumeFont)
          .fontSize(7.5)
          .fillColor(colors.muted)
          .text(label, x, cellY, { lineBreak: false });
        const labelWidth = document.widthOfString(label) + 10;
        drawLinesAt(
          value,
          x + labelWidth,
          cellY,
          cellWidth - labelWidth,
          8.3,
          colors.ink,
        );
      });
      y = boxY + 84;
      drawSummaryCards();
      drawTechnologyTags();
    };

    const drawEmployment = () => {
      model.employment.forEach((employment) => {
        drawRecord(employment);
        employment.projects.forEach((project) => {
          const previousY = y;
          ensureSpace(52);
          if (y < previousY) {
            drawLinesAt(
              employment.organization,
              left + 82,
              y,
              textWidth - 82,
              8.5,
              colors.muted,
            );
            y += 14;
          }
          activeProjectTitle = project.title;
          drawRecord(project, { indent: 82, compact: true });
          project.workItems.forEach((workItem) => {
            ensureSpace(32);
            activeWorkItemTitle = workItem.title;
            const x = left + 98;
            const width = textWidth - 98;
            if (workItem.title) {
              writeLines(`• ${workItem.title}`, x, width, 8.8, colors.ink, {
                gapAfter: 1,
              });
            }
            workItem.descriptions.forEach((description) => {
              writeLines(
                `- ${description}`,
                x + 8,
                width - 8,
                8.2,
                colors.ink,
                {
                  gapAfter: 1,
                },
              );
            });
            workItem.narratives.forEach((narrative) => {
              writeLines(narrative, x + 8, width - 8, 8.2, colors.ink, {
                gapAfter: 1,
              });
            });
            workItem.outcomes.forEach((outcome) => {
              writeLines(
                `성과  ${outcome}`,
                x + 8,
                width - 8,
                8.2,
                colors.blue,
                { gapAfter: 1 },
              );
            });
            y += 3;
            activeWorkItemTitle = "";
          });
          activeProjectTitle = "";
        });
      });
      model.unassignedProjects.forEach((project) => drawRecord(project));
    };

    drawProfile();
    if (model.education.length > 0) {
      drawSectionTitle("학력");
      model.education.forEach((record) => drawRecord(record));
    }
    if (model.employment.length > 0 || model.unassignedProjects.length > 0) {
      drawSectionTitle("경력");
      drawEmployment();
    }
    if (model.activities.length > 0) {
      drawSectionTitle("인턴·대외활동");
      model.activities.forEach((record) => drawRecord(record));
    }
    if (model.training.length > 0) {
      drawSectionTitle("교육");
      model.training.forEach((record) => drawRecord(record));
    }
    if (model.certifications.length > 0) {
      drawSectionTitle("자격증");
      model.certifications.forEach((record) => drawRecord(record));
    }
    if (model.statements.length > 0) {
      drawSectionTitle("자기소개서");
      model.statements.forEach((record) => drawRecord(record));
    }
    if (model.portfolio.length > 0) {
      drawSectionTitle("포트폴리오");
      model.portfolio.forEach((record) => drawRecord(record));
    }
    if (model.militaryService) {
      drawSectionTitle("병역사항");
      ensureSpace(34);
      document
        .rect(left, y, textWidth, 34)
        .fillAndStroke(colors.white, colors.border);
      document.rect(left, y, 112, 34).fillAndStroke(colors.pale, colors.border);
      drawLinesAt("병역", left + 10, y + 11, 92, 9, colors.ink);
      drawLinesAt(
        model.militaryService,
        left + 124,
        y + 10,
        textWidth - 136,
        9,
        colors.ink,
      );
      y += 42;
    }
    if (model.preferences.length > 0) {
      drawSectionTitle("희망근무조건");
      drawPreferences();
    }

    document.end();
  });
