import { composeResume } from "../compose/composeResume";
import {
  ResumeConnectionError,
  type ResumeConnectionInput,
} from "../connection/resumeConnection";
import type { ResumeModel, ResumeXmlNode } from "../model/resumeModel";
import { previewResume } from "../output/previewResume";
import { renderResumeForm } from "../output/renderResumeForm";
import { renderResumeTemplate } from "../output/renderResumeTemplate";

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

    if (name === "preview_resume") {
      const composed = composeResume(await loadFromArgs(args, connection), {
        elementIds: readStringList(args.elementIds),
        sectionOrder: readStringList(args.sectionOrder),
      });
      return { ok: true, text: previewResume(composed) };
    }

    if (name === "render_resume_template") {
      const template = args.template;
      if (
        template !== "기본형" &&
        template !== "경력 중심형" &&
        template !== "프로젝트 중심형"
      ) {
        return fail("UNKNOWN_TEMPLATE");
      }
      const composed = composeResume(await loadFromArgs(args, connection), {
        elementIds: readStringList(args.elementIds),
        sectionOrder: readStringList(args.sectionOrder),
      });
      return { ok: true, text: renderResumeTemplate(composed, template) };
    }

    if (name === "render_resume_form") {
      const template = args.template;
      if (
        template !== "기본형" &&
        template !== "경력 중심형" &&
        template !== "프로젝트 중심형"
      ) {
        return fail("UNKNOWN_TEMPLATE");
      }
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
