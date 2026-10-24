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
  type DraftClaim,
  type ResumeSelectionNode,
} from "@mcp/resume/output/checkResumeDraft";
import { previewResume } from "@mcp/resume/output/previewResume";
import {
  renderResumeForm,
  renderResumeFormSections,
} from "@mcp/resume/output/renderResumeForm";
import { renderResumeTemplate } from "@mcp/resume/output/renderResumeTemplate";
import {
  generateResume,
  type ResumeModelClient,
} from "@mcp/resume/output/runResumeHarness";
import { selectTemplateSections } from "@mcp/resume/output/selectTemplateSections";

export type ResumeToolResult =
  | { ok: true; text: string }
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
    return {
      text: record.text,
      sourceIds: readStringList(record.sourceIds),
    };
  });
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
          await generateResume(readSelection(composed, template), {
            claims:
              args.claims === undefined ? undefined : readClaims(args.claims),
            interpretation:
              typeof args.interpretation === "string"
                ? args.interpretation
                : undefined,
            model,
            forms: renderResumeFormSections(composed, template),
          }),
        ),
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
