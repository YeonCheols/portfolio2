import { composeResume } from "@mcp/resume/compose/composeResume";
import {
  ResumeConnectionError,
  type ResumeConnectionInput,
} from "@mcp/resume/connection/resumeConnection";
import type { ResumeModel, ResumeXmlNode } from "@mcp/resume/model/resumeModel";
import {
  isResumeTemplate,
  type ResumeTemplate,
} from "@mcp/resume/model/resumeTemplate";
import {
  checkResumeDraft,
  type CheckedDraftClaim,
  type DraftClaim,
  type ResumeSelectionNode,
} from "@mcp/resume/output/checkResumeDraft";
import { previewResume } from "@mcp/resume/output/previewResume";
import {
  renderResumeForm,
  renderResumeFormSections,
} from "@mcp/resume/output/renderResumeForm";
import { renderResumeTemplate } from "@mcp/resume/output/renderResumeTemplate";
import { createResumePdf } from "@mcp/resume/output/createResumePdf";
import {
  generateResume,
  generatedResumePromptTitle,
  generatedResumeSectionNames,
  type ResumeModelClient,
} from "@mcp/resume/output/runResumeHarness";
import { selectTemplateSections } from "@mcp/resume/output/selectTemplateSections";

export type ResumeToolContent =
  | { type: "text"; text: string }
  | {
      type: "resource";
      resource: { uri: string; mimeType: string; blob: string };
    };

export type ResumeToolResult =
  | { ok: true; text: string; content?: ResumeToolContent[] }
  | { ok: false; code: string };

export type ResumeConnection = {
  load: (input: ResumeConnectionInput) => Promise<ResumeModel>;
};

const fail = (code: string): never => {
  throw new ResumeConnectionError(code);
};

const readSource = (
  args: Record<string, unknown>,
): ResumeConnectionInput["source"] => {
  if (
    args.source === "repository" ||
    args.source === "embedded" ||
    args.source === "file"
  ) {
    return args.source;
  }

  return fail("INVALID_INPUT");
};

const readStringList = (value: unknown): string[] => {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    return fail("INVALID_INPUT");
  }

  return value;
};

const readClaims = (value: unknown): DraftClaim[] => {
  if (!Array.isArray(value)) return fail("INVALID_INPUT");

  return value.map((item) => {
    if (typeof item !== "object" || item === null) return fail("INVALID_INPUT");
    const record = item as Record<string, unknown>;
    if (typeof record.text !== "string") return fail("INVALID_INPUT");
    if (record.formItem !== undefined && typeof record.formItem !== "string") {
      return fail("INVALID_INPUT");
    }
    return {
      text: record.text,
      sourceIds: readStringList(record.sourceIds),
      ...(typeof record.formItem === "string"
        ? { formItem: record.formItem }
        : {}),
    };
  });
};

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

const isResumeSelectionNode = (
  value: unknown,
): value is ResumeSelectionNode => {
  if (typeof value !== "object" || value === null) return false;
  const node = value as Record<string, unknown>;
  return (
    typeof node.section === "string" &&
    typeof node.name === "string" &&
    typeof node.text === "string" &&
    typeof node.visibility === "string" &&
    isStringArray(node.sourceRefs) &&
    Array.isArray(node.children) &&
    node.children.every(isResumeSelectionNode) &&
    (node.id === undefined || typeof node.id === "string") &&
    (node.employmentRef === undefined ||
      typeof node.employmentRef === "string") &&
    (node.projectRef === undefined || typeof node.projectRef === "string") &&
    (node.workItemRef === undefined || typeof node.workItemRef === "string")
  );
};

const isCheckedDraftClaim = (value: unknown): value is CheckedDraftClaim => {
  if (typeof value !== "object" || value === null) return false;
  const claim = value as Record<string, unknown>;
  return (
    typeof claim.text === "string" &&
    isStringArray(claim.sourceIds) &&
    Array.isArray(claim.sources) &&
    claim.sources.every(isResumeSelectionNode) &&
    (claim.formItem === undefined || typeof claim.formItem === "string")
  );
};

const readGeneratedResume = (
  value: unknown,
): { resume: string; claims: DraftClaim[] } => {
  if (typeof value !== "string") return fail("INVALID_INPUT");

  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return fail("INVALID_INPUT");
  }

  if (typeof parsed !== "object" || parsed === null) {
    return fail("INCOMPLETE_RESUME");
  }
  const result = parsed as Record<string, unknown>;
  if (
    typeof result.resume !== "string" ||
    result.resume.trim() === "" ||
    !Array.isArray(result.claims) ||
    !Array.isArray(result.gaps) ||
    !Array.isArray(result.conflicts) ||
    !Array.isArray(result.uncertain) ||
    !Array.isArray(result.selection) ||
    !result.claims.every(isCheckedDraftClaim) ||
    !result.selection.every(isResumeSelectionNode)
  ) {
    return fail("INCOMPLETE_RESUME");
  }

  return {
    resume: result.resume,
    claims: readClaims(result.claims),
  };
};

const readTemplate = (value: unknown): ResumeTemplate => {
  if (!isResumeTemplate(value)) return fail("UNKNOWN_TEMPLATE");
  return value;
};

const loadFromArgs = (
  args: Record<string, unknown>,
  connection: ResumeConnection,
) =>
  connection.load({
    source: readSource(args),
    xml: typeof args.xml === "string" ? args.xml : undefined,
  });

const collectElements = (
  section: string,
  nodes: readonly ResumeXmlNode[],
  found: {
    id: string;
    section: string;
    name: string;
    sourceRefs: readonly string[];
  }[],
) => {
  nodes.forEach((node) => {
    if (node.attributes.id) {
      found.push({
        id: node.attributes.id,
        section,
        name: node.name,
        sourceRefs: node.references.sourceRefs ?? [],
      });
    }
    collectElements(section, node.children, found);
  });
};

const listElements = (resume: ResumeModel): string => {
  const found: {
    id: string;
    section: string;
    name: string;
    sourceRefs: readonly string[];
  }[] = [];
  Object.entries(resume.sections).forEach(([section, nodes]) => {
    collectElements(section, nodes, found);
  });
  return JSON.stringify(found);
};

const selectionNode = (
  section: string,
  node: ResumeXmlNode,
): ResumeSelectionNode => {
  const record: ResumeSelectionNode = {
    section,
    name: node.name,
    text: node.text,
    sourceRefs: node.references.sourceRefs ?? [],
    visibility: node.attributes.visibility ?? "",
    children: node.children.map((child) => selectionNode(section, child)),
  };
  if (node.attributes.id) record.id = node.attributes.id;
  const employmentRef =
    node.references.employmentRef?.[0] ?? node.attributes.employmentRef;
  if (employmentRef) record.employmentRef = employmentRef;
  const projectRef =
    node.references.projectRef?.[0] ?? node.attributes.projectRef;
  if (projectRef) record.projectRef = projectRef;
  const workItemRef =
    node.references.workItemRef?.[0] ?? node.attributes.workItemRef;
  if (workItemRef) record.workItemRef = workItemRef;
  return record;
};

const collectSelection = (
  section: string,
  nodes: readonly ResumeXmlNode[],
  found: ResumeSelectionNode[],
) => {
  nodes.forEach((node) => {
    if (node.attributes.id) {
      found.push(selectionNode(section, node));
      return;
    }
    collectSelection(section, node.children, found);
  });
};

const readComposeInput = (args: Record<string, unknown>) => ({
  elementIds: readStringList(args.elementIds),
  sectionOrder: readStringList(args.sectionOrder),
});

const loadTemplateResume = async (
  args: Record<string, unknown>,
  connection: ResumeConnection,
) => {
  const template = readTemplate(args.template);
  const composed = composeResume(
    await loadFromArgs(args, connection),
    readComposeInput(args),
  );
  return { template, composed };
};

const readSelection = (
  resume: ResumeModel,
  template: ResumeTemplate,
): ResumeSelectionNode[] => {
  const found: ResumeSelectionNode[] = [];
  selectTemplateSections(resume, template).forEach(({ name, nodes }) => {
    collectSelection(name, nodes, found);
  });
  return found;
};

const generatedTemplateSections = new Set([
  "profile",
  "educationHistory",
  "employmentHistory",
  "projects",
]);

const readGeneratedSelection = (
  resume: ResumeModel,
  template: ResumeTemplate,
): ResumeSelectionNode[] => {
  const selectedSections = selectTemplateSections(resume, template);
  const generatedSections = generatedResumeSectionNames
    .filter((section) => !generatedTemplateSections.has(section))
    .flatMap((name) => {
      const nodes = resume.sections[name] ?? [];
      return nodes.length > 0 ? [{ name, nodes }] : [];
    });
  const found: ResumeSelectionNode[] = [];

  [...selectedSections, ...generatedSections].forEach(({ name, nodes }) => {
    collectSelection(name, nodes, found);
  });

  return found;
};

const generatedResumeForms = (
  resume: ResumeModel,
  template: ResumeTemplate,
) => {
  const forms = renderResumeFormSections(resume, template);
  const existingSections = new Set(forms.map(({ section }) => section));
  const supplementalForms = generatedResumeSectionNames
    .filter(
      (section) =>
        !generatedTemplateSections.has(section) &&
        !existingSections.has(section) &&
        (resume.sections[section]?.length ?? 0) > 0,
    )
    .flatMap((section) => {
      const text = generatedResumePromptTitle(section);
      return text ? [{ section, text }] : [];
    });

  return [...forms, ...supplementalForms];
};

export const callResumeTool = async (
  name: string,
  args: Record<string, unknown>,
  connection: ResumeConnection,
  model?: ResumeModelClient,
): Promise<ResumeToolResult> => {
  try {
    if (name === "validate_resume_xml") {
      const resume = await loadFromArgs(args, connection);
      return { ok: true, text: resume.id };
    }

    if (name === "list_resume_elements") {
      return {
        ok: true,
        text: listElements(await loadFromArgs(args, connection)),
      };
    }

    if (name === "read_resume_selection") {
      const { template, composed } = await loadTemplateResume(args, connection);
      return {
        ok: true,
        text: JSON.stringify(readSelection(composed, template)),
      };
    }

    if (name === "generate_resume") {
      const { template, composed } = await loadTemplateResume(args, connection);
      return {
        ok: true,
        text: JSON.stringify(
          await generateResume(readGeneratedSelection(composed, template), {
            claims:
              args.claims === undefined ? undefined : readClaims(args.claims),
            interpretation:
              typeof args.interpretation === "string"
                ? args.interpretation
                : undefined,
            model,
            forms: generatedResumeForms(composed, template),
          }),
        ),
      };
    }

    if (name === "convert_resume_to_pdf") {
      const generated = readGeneratedResume(args.generatedResume);
      const { template, composed } = await loadTemplateResume(args, connection);
      const selection = readGeneratedSelection(composed, template);
      const checked = checkResumeDraft(selection, generated.claims);
      const pdf = await createResumePdf({
        resume: generated.resume,
        claims: checked.claims,
        selection,
      });
      return {
        ok: true,
        text: "이력서 PDF를 생성했습니다.",
        content: [
          { type: "text", text: "이력서 PDF를 생성했습니다." },
          {
            type: "resource",
            resource: {
              uri: `resume://generated/${crypto.randomUUID()}.pdf`,
              mimeType: "application/pdf",
              blob: pdf.toString("base64"),
            },
          },
        ],
      };
    }

    if (name === "check_resume_draft") {
      const { template, composed } = await loadTemplateResume(args, connection);
      return {
        ok: true,
        text: JSON.stringify(
          checkResumeDraft(
            readSelection(composed, template),
            readClaims(args.claims),
          ),
        ),
      };
    }

    if (name === "preview_resume") {
      const composed = composeResume(
        await loadFromArgs(args, connection),
        readComposeInput(args),
      );
      return { ok: true, text: previewResume(composed) };
    }

    if (name === "render_resume_template") {
      const { template, composed } = await loadTemplateResume(args, connection);
      return { ok: true, text: renderResumeTemplate(composed, template) };
    }

    if (name === "render_resume_form") {
      const { template, composed } = await loadTemplateResume(args, connection);
      return { ok: true, text: renderResumeForm(composed, template) };
    }

    return { ok: false, code: "UNKNOWN_TOOL" };
  } catch (error) {
    if (error instanceof ResumeConnectionError) {
      return { ok: false, code: error.code };
    }

    throw error;
  }
};
