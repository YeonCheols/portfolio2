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
import { previewResume } from "@mcp/resume/output/previewResume";
import { renderResumeForm } from "@mcp/resume/output/renderResumeForm";
import { renderResumeTemplate } from "@mcp/resume/output/renderResumeTemplate";
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

type ResumeSelectionNode = {
  id?: string;
  section: string;
  name: string;
  text: string;
  sourceRefs: readonly string[];
  visibility: string;
  children: ResumeSelectionNode[];
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

const readSelection = (
  resume: ResumeModel,
  template: ResumeTemplate,
): string => {
  const found: ResumeSelectionNode[] = [];
  selectTemplateSections(resume, template).forEach(({ name, nodes }) => {
    collectSelection(name, nodes, found);
  });
  return JSON.stringify(found);
};

export const callResumeTool = async (
  name: string,
  args: Record<string, unknown>,
  connection: ResumeConnection,
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
      const template = readTemplate(args.template);
      const composed = composeResume(await loadFromArgs(args, connection), {
        elementIds: readStringList(args.elementIds),
        sectionOrder: readStringList(args.sectionOrder),
      });
      return { ok: true, text: readSelection(composed, template) };
    }

    if (name === "preview_resume") {
      const composed = composeResume(await loadFromArgs(args, connection), {
        elementIds: readStringList(args.elementIds),
        sectionOrder: readStringList(args.sectionOrder),
      });
      return { ok: true, text: previewResume(composed) };
    }

    if (name === "render_resume_template") {
      const template = readTemplate(args.template);
      const composed = composeResume(await loadFromArgs(args, connection), {
        elementIds: readStringList(args.elementIds),
        sectionOrder: readStringList(args.sectionOrder),
      });
      return { ok: true, text: renderResumeTemplate(composed, template) };
    }

    if (name === "render_resume_form") {
      const template = readTemplate(args.template);
      const composed = composeResume(await loadFromArgs(args, connection), {
        elementIds: readStringList(args.elementIds),
        sectionOrder: readStringList(args.sectionOrder),
      });
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
