import type { GeneratedResume } from "@mcp/modules/resume/generation/run-resume-harness";
import { aggregateMetricCases } from "@mcp/modules/quality-evaluation/evaluation-calculations";
import type {
  MetricEvaluationAggregate,
  QualityEvaluationRun,
} from "@mcp/modules/quality-evaluation/evaluation-contract";
import { buildResumePdfModel } from "@mcp/modules/resume/render/create-resume-pdf";
import { createResumeQualityEvaluation } from "@mcp/modules/resume/quality/create-resume-quality-evaluation";
import { resumeQualityPolicy } from "@mcp/modules/resume/quality/resume-quality-policy";

export type ResumeQualityEvaluation = {
  run: QualityEvaluationRun;
  aggregates: readonly MetricEvaluationAggregate[];
};

export type EvaluateResumePdfQualityInput = {
  generated: Pick<GeneratedResume, "resume" | "claims" | "selection">;
  evaluationId: string;
  evaluatedAt: string;
  inputRef: string;
  outputRef: string;
  pdfPageCount: number | null;
};

type PdfTextBlock = { caseId: string; text: string; ownerId?: string };
type ResumeSourceFact = {
  reference: string;
  factPath: string;
  section: string;
  text: string;
  ownerId?: string;
};

const resumePdfSections = new Set([
  "profile",
  "educationHistory",
  "employmentHistory",
  "projects",
  "workItems",
  "outcomes",
  "activities",
  "contributions",
  "initiatives",
  "trainingHistory",
  "certifications",
  "personalStatements",
  "portfolioReferences",
  "technologies",
  "employmentEligibility",
  "employmentPreferences",
]);

const requiredItemFields: Record<
  string,
  {
    name: string;
    field: string | readonly string[];
    modelPath: readonly string[];
  }[]
> = {
  "profile/profile": [
    { name: "profile-name", field: "name", modelPath: ["profile", "name"] },
  ],
  "educationHistory/education": [
    {
      name: "education-institution",
      field: "institution",
      modelPath: ["title"],
    },
  ],
  "employmentHistory/employment": [
    {
      name: "employment-organization",
      field: "organization",
      modelPath: ["organization"],
    },
  ],
  "projects/project": [
    { name: "project-title", field: "title", modelPath: ["title"] },
  ],
  "activities/activity": [
    {
      name: "activity-heading",
      field: ["organization", "title"],
      modelPath: ["title", "subtitle"],
    },
  ],
  "contributions/contribution": [
    {
      name: "activity-heading",
      field: ["organization", "title"],
      modelPath: ["title", "subtitle"],
    },
  ],
  "initiatives/initiative": [
    {
      name: "activity-heading",
      field: ["organization", "title"],
      modelPath: ["title", "subtitle"],
    },
  ],
  "workItems/workItem": [
    { name: "work-item-title", field: "title", modelPath: ["title"] },
  ],
  "trainingHistory/training": [
    { name: "training-title", field: "title", modelPath: ["title"] },
  ],
  "certifications/certification": [
    { name: "certification-name", field: "name", modelPath: ["title"] },
  ],
  "personalStatements/statement": [
    { name: "statement-title", field: "title", modelPath: ["title"] },
  ],
  "portfolioReferences/portfolioReference": [
    { name: "portfolio-reference", field: "value", modelPath: ["title"] },
  ],
};

const collectPdfTextBlocks = (
  value: unknown,
  path = "output",
  ownerId?: string,
): PdfTextBlock[] => {
  if (typeof value === "string")
    return value.trim()
      ? [{ caseId: path, text: value.trim(), ...(ownerId ? { ownerId } : {}) }]
      : [];
  if (Array.isArray(value))
    return value.flatMap((item, index) =>
      collectPdfTextBlocks(item, `${path}/${index}`, ownerId),
    );
  if (typeof value !== "object" || value === null) return [];

  const record = value as Record<string, unknown>;
  const currentOwnerId = typeof record.id === "string" ? record.id : ownerId;
  return Object.entries(record).flatMap(([key, child]) => {
    if (["id", "label", "employmentRef"].includes(key)) return [];
    return collectPdfTextBlocks(child, `${path}/${key}`, currentOwnerId);
  });
};

const collectSourceTexts = (
  selection: readonly GeneratedResume["selection"][number][],
) => {
  const facts: ResumeSourceFact[] = [];
  const visit = (
    nodes: readonly GeneratedResume["selection"][number][],
    parentReference: string,
    parentPath: string,
  ) => {
    nodes.forEach((node, index) => {
      if (node.visibility !== "public") return;
      const path = `${parentPath}/${node.section}/${index}/${node.name}`;
      const reference = node.id ?? (parentReference || path);
      const text = node.text.trim();
      if (text)
        facts.push({
          reference,
          factPath: `${path}/text`,
          section: node.section,
          text,
          ...(node.id
            ? { ownerId: node.id }
            : parentReference
              ? { ownerId: parentReference }
              : {}),
        });
      visit(node.children, reference, path);
    });
  };
  visit(selection, "", "selection");
  return facts;
};

const normalizeText = (value: string): string =>
  value.normalize("NFC").replace(/\s+/gu, " ").trim();

export const countResumePdfPages = (pdf: Buffer): number | null => {
  const content = pdf.toString("latin1");
  if (!content.startsWith("%PDF-")) return null;
  return [...content.matchAll(/\/Type\s*\/Page(?!s)\b/gu)].length;
};

const publicNodeText = (node: GeneratedResume["selection"][number]): string =>
  node.visibility === "public"
    ? [node.text, ...node.children.map(publicNodeText)]
        .filter(Boolean)
        .join(" · ")
    : "";

const propertyAtPath = (value: unknown, path: readonly string[]): unknown =>
  path.reduce<unknown>((current, key) => {
    if (typeof current !== "object" || current === null) return undefined;
    return (current as Record<string, unknown>)[key];
  }, value);

const findModelRecord = (value: unknown, id: string): unknown => {
  if (Array.isArray(value)) {
    for (const item of value) {
      const match = findModelRecord(item, id);
      if (match !== undefined) return match;
    }
    return undefined;
  }
  if (typeof value !== "object" || value === null) return undefined;
  const record = value as Record<string, unknown>;
  if (record.id === id) return record;
  for (const item of Object.values(record)) {
    const match = findModelRecord(item, id);
    if (match !== undefined) return match;
  }
  return undefined;
};

const collectRequiredItemCases = (
  selection: EvaluateResumePdfQualityInput["generated"]["selection"],
  model: ReturnType<typeof buildResumePdfModel>,
) =>
  selection.flatMap((node, index) => {
    if (node.visibility !== "public" || !resumePdfSections.has(node.section))
      return [];
    const definitions = requiredItemFields[`${node.section}/${node.name}`];
    if (!definitions) return [];

    return definitions.map((definition) => {
      const caseId = `required-item/${node.section}/${node.id ?? index}/${definition.name}`;
      if (!publicNodeText(node).trim())
        return {
          metricId: "required-item-coverage",
          caseId,
          decision: "not_applicable" as const,
          evidence: [{ kind: "source_item", reference: node.id ?? caseId }],
          reasonCode: "REQUIRED_ITEM_HAS_NO_PUBLIC_SOURCE_CONTENT",
        };

      const fieldNames = Array.isArray(definition.field)
        ? definition.field
        : [definition.field];
      const hasSourceField = node.children.some(
        (child) =>
          fieldNames.includes(child.name) &&
          child.visibility === "public" &&
          Boolean(publicNodeText(child).trim()),
      );
      if (!hasSourceField)
        return {
          metricId: "required-item-coverage",
          caseId,
          decision: "fail" as const,
          evidence: [{ kind: "source_item", reference: node.id ?? caseId }],
          reasonCode: "REQUIRED_ITEM_SOURCE_FIELD_MISSING",
        };
      if (!node.id)
        return {
          metricId: "required-item-coverage",
          caseId,
          decision: "measurement_failed" as const,
          evidence: [{ kind: "source_item", reference: caseId }],
          reasonCode: "REQUIRED_ITEM_SOURCE_ID_MISSING",
        };

      const modelRecord =
        node.section === "profile"
          ? model.profile
          : findModelRecord(model, node.id);
      const present = definition.modelPath.some((path) => {
        const value = propertyAtPath(modelRecord, [path]);
        return typeof value === "string" && Boolean(value.trim());
      });
      return {
        metricId: "required-item-coverage",
        caseId,
        decision: present ? ("pass" as const) : ("fail" as const),
        evidence: [
          { kind: "source_item", reference: node.id },
          { kind: "output_item", reference: node.id },
        ],
        reasonCode: present
          ? "REQUIRED_ITEM_PRESENT"
          : "REQUIRED_ITEM_MISSING_FROM_PDF_MODEL",
      };
    });
  });

/** Builds conservative output-derived cases; semantic checks remain human-owned. */
export const evaluateResumePdfQuality = (
  input: EvaluateResumePdfQualityInput,
): ResumeQualityEvaluation => {
  const model = buildResumePdfModel(input.generated);
  const sourceTexts = collectSourceTexts(input.generated.selection).filter(
    ({ section }) => resumePdfSections.has(section),
  );
  const blocks = collectPdfTextBlocks(model).map((block) => {
    if (block.ownerId) return block;
    const sourceOwners = new Set(
      sourceTexts
        .filter(
          (fact) => normalizeText(fact.text) === normalizeText(block.text),
        )
        .map(({ reference }) => reference),
    );
    return sourceOwners.size === 1
      ? { ...block, ownerId: [...sourceOwners][0] }
      : block;
  });
  const cases = blocks.flatMap((block) => {
    const normalized = normalizeText(block.text);
    const matchingClaim = input.generated.claims.find(
      (claim) => normalizeText(claim.text) === normalized,
    );
    const matchingSource = sourceTexts.find(
      (fact) =>
        normalizeText(fact.text) === normalized &&
        fact.reference === block.ownerId,
    );
    const sourceReferences =
      matchingClaim?.sourceIds ??
      (matchingSource ? [matchingSource.reference] : []);
    const evidence = sourceReferences.map((reference) => ({
      kind: "source_fact",
      reference,
    }));
    const claimCase = {
      metricId: "claim-support",
      caseId: block.caseId,
      decision: matchingClaim
        ? ("needs_review" as const)
        : matchingSource
          ? ("pass" as const)
          : ("measurement_failed" as const),
      evidence: [
        ...evidence,
        { kind: "output_block", reference: block.caseId },
      ],
      reasonCode: matchingClaim
        ? "SEMANTIC_SUPPORT_REQUIRES_REVIEW"
        : matchingSource
          ? "SOURCE_FALLBACK_MATCHED_EXACTLY"
          : "OUTPUT_BLOCK_SOURCE_NOT_IDENTIFIED",
    };
    const numericCases = [...block.text.matchAll(/\d+(?:[.,]\d+)?/gu)].map(
      (match, numericIndex) => ({
        metricId: "numeric-integrity",
        caseId: `${block.caseId}/number/${numericIndex}`,
        decision: matchingClaim
          ? ("needs_review" as const)
          : matchingSource
            ? ("pass" as const)
            : ("measurement_failed" as const),
        evidence: [
          ...evidence,
          {
            kind: "output_numeric_assertion",
            reference: `${block.caseId}/number/${numericIndex}`,
          },
        ],
        reasonCode: matchingClaim
          ? "NUMERIC_ASSERTION_REQUIRES_VALUE_UNIT_ATTRIBUTION_REVIEW"
          : matchingSource
            ? "NUMERIC_SOURCE_FALLBACK_MATCHED_EXACTLY"
            : "NUMERIC_SOURCE_NOT_IDENTIFIED",
      }),
    );
    return [claimCase, ...numericCases];
  });

  const sourceFactCases = sourceTexts.map((fact) => {
    const matchingBlock = blocks.find(
      (block) =>
        normalizeText(block.text) === normalizeText(fact.text) &&
        block.ownerId === fact.reference,
    );
    const supportedClaim = Boolean(
      fact.ownerId &&
        input.generated.claims.some(
          (claim) =>
            claim.sourceIds.includes(fact.ownerId as string) &&
            blocks.some(
              (block) =>
                block.ownerId === fact.ownerId &&
                normalizeText(block.text) === normalizeText(claim.text),
            ),
        ),
    );
    const decision = matchingBlock
      ? ("pass" as const)
      : supportedClaim
        ? ("needs_review" as const)
        : ("fail" as const);
    return {
      metricId: "required-fact-preservation",
      caseId: `source-fact/${fact.factPath}`,
      decision,
      evidence: [
        { kind: "source_fact", reference: fact.reference },
        ...(matchingBlock
          ? [{ kind: "output_block", reference: matchingBlock.caseId }]
          : []),
      ],
      reasonCode: matchingBlock
        ? "SOURCE_FACT_PRESERVED_EXACTLY"
        : supportedClaim
          ? "SOURCE_FACT_REWRITE_REQUIRES_REVIEW"
          : "SOURCE_FACT_MISSING_FROM_OUTPUT",
    };
  });

  const requiredItemCases = collectRequiredItemCases(
    input.generated.selection,
    model,
  );
  const duplicateGroups = new Map<string, PdfTextBlock[]>();
  blocks
    .filter((block) => !block.caseId.includes("/summaryCards/"))
    .forEach((block) => {
      const key = normalizeText(block.text);
      const group = duplicateGroups.get(key) ?? [];
      group.push(block);
      duplicateGroups.set(key, group);
    });
  const duplicateCases = [...duplicateGroups.values()].flatMap((group) =>
    group.map((block, index) => ({
      metricId: "duplicate-content",
      caseId: block.caseId,
      decision:
        group.length === 1 || index === 0
          ? ("pass" as const)
          : ("fail" as const),
      evidence: [{ kind: "output_block", reference: block.caseId }],
      ...(group.length > 1 && index > 0
        ? { reasonCode: "DUPLICATE_OUTPUT_TEXT" }
        : {}),
    })),
  );
  const proofreadingCases = blocks.map((block) => ({
    metricId: "text-proofreading",
    caseId: block.caseId,
    decision: "needs_review" as const,
    evidence: [{ kind: "output_text", reference: block.caseId }],
    reasonCode: "VISIBLE_TEXT_REQUIRES_PROOFREADING",
  }));
  const pdfLayoutCases =
    Number.isInteger(input.pdfPageCount) && input.pdfPageCount! > 0
      ? Array.from({ length: input.pdfPageCount! }, (_, index) => ({
          metricId: "pdf-layout",
          caseId: `pdf-page/${index + 1}`,
          decision: "needs_review" as const,
          evidence: [
            {
              kind: "pdf_page",
              reference: `${input.outputRef}/page/${index + 1}`,
            },
          ],
          reasonCode: "PDF_PAGE_LAYOUT_REQUIRES_VISUAL_REVIEW",
        }))
      : [
          {
            metricId: "pdf-layout",
            caseId: "pdf-page-count",
            decision: "measurement_failed" as const,
            evidence: [{ kind: "pdf_output", reference: input.outputRef }],
            reasonCode: "PDF_PAGE_COUNT_UNAVAILABLE",
          },
        ];

  const run = createResumeQualityEvaluation({
    ...input,
    cases: [
      ...cases,
      ...sourceFactCases,
      ...requiredItemCases,
      ...duplicateCases,
      ...proofreadingCases,
      ...pdfLayoutCases,
    ],
  });
  const aggregates = resumeQualityPolicy.metrics.map((metric) =>
    aggregateMetricCases(run, {
      metricId: metric.metricId,
      stage: metric.stage,
      populationMode: metric.populationMode,
      unit: metric.unit,
    }),
  );

  return { run, aggregates };
};
