import { composeResume } from "@mcp/resume/compose/composeResume";
import type { ResumeConnectionInput } from "@mcp/resume/connection/resume/resumeConnection";
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
import { createResumePdf } from "@mcp/resume/output/createResumePdf";
import { previewResume } from "@mcp/resume/output/previewResume";
import {
  renderResumeForm,
  renderResumeFormSections,
} from "@mcp/resume/output/renderResumeForm";
import { renderResumeTemplate } from "@mcp/resume/output/renderResumeTemplate";
import type { ResumeGenerationContext } from "@mcp/resume/output/resumeGenerationStore";
import {
  generateResume,
  completeResumeGeneration,
  generatedResumePromptTitle,
  generatedResumeSectionNames,
  type ResumeModelClient,
} from "@mcp/resume/output/runResumeHarness";
import { selectTemplateSections } from "@mcp/resume/output/selectTemplateSections";
import { ResumeConnectionError } from "@mcp/resume/connection/shared/connection";

export type ResumeToolContent =
  | { type: "text"; text: string }
  | {
      type: "resource";
      resource: { uri: string; mimeType: string; blob: string };
    };

export type ResumeToolResult =
  | { ok: true; text: string; content?: ResumeToolContent[] }
  | { ok: false; code: string; generationId?: string };

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
    if (
      record.evidence !== undefined &&
      (!Array.isArray(record.evidence) ||
        !record.evidence.every(
          (item: unknown) =>
            typeof item === "object" &&
            item !== null &&
            "sourceId" in item &&
            typeof item.sourceId === "string" &&
            "quote" in item &&
            typeof item.quote === "string",
        ))
    )
      return fail("INVALID_INPUT");
    return {
      ...(Array.isArray(record.evidence)
        ? {
            evidence: record.evidence.map(
              (item: { sourceId: string; quote: string }) => ({
                sourceId: item.sourceId,
                quote: item.quote,
              }),
            ),
          }
        : {}),
      text: record.text,
      sourceIds: readStringList(record.sourceIds),
      ...(typeof record.formItem === "string"
        ? { formItem: record.formItem }
        : {}),
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
  generation?: ResumeGenerationContext,
): Promise<ResumeToolResult> => {
  let generationId: string | undefined;
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

    if (name === "generate_resume" || name === "convert_resume_to_pdf") {
      if (
        !generation?.scope.subject.trim() ||
        !generation.scope.environment.trim()
      ) {
        return { ok: false, code: "GENERATION_CONTEXT_REQUIRED" };
      }
      const { store, scope } = generation;
      const isPdf = name === "convert_resume_to_pdf";
      if (args.generatedResume !== undefined)
        return { ok: false, code: "INVALID_INPUT" };
      let generated;
      if (args.generationId !== undefined || isPdf) {
        if (Object.keys(args).some((key) => key !== "generationId"))
          return { ok: false, code: "INVALID_INPUT" };
        if (typeof args.generationId !== "string" || !args.generationId.trim())
          return { ok: false, code: "GENERATION_ID_REQUIRED" };
        generationId = args.generationId;
        const stored = store.read(scope, generationId);
        if (stored.response === undefined || !stored.snapshot)
          return { ok: false, code: "GENERATION_NOT_READY", generationId };
        generated = completeResumeGeneration(
          stored.snapshot.selection,
          stored.response,
        );
      } else {
        // 검증된 새 생성 접수 즉시 이전 응답을 폐기합니다. 비동기 소스 조회보다 먼저 실행합니다.
        readSource(args);
        readTemplate(args.template);
        readStringList(args.elementIds);
        readStringList(args.sectionOrder);
        const claims =
          args.claims === undefined ? undefined : readClaims(args.claims);
        if (args.interpretation !== undefined)
          return { ok: false, code: "INVALID_INPUT" };
        generationId = store.begin(scope);
        if (claims === undefined && !model)
          return { ok: false, code: "MISSING_MODEL_CONNECTION", generationId };
        const { template, composed } = await loadTemplateResume(
          args,
          connection,
        );
        const selection = readGeneratedSelection(composed, template);
        const forms = generatedResumeForms(composed, template);
        store.snapshot(scope, generationId, { selection, forms });
        const id = generationId;
        if (claims !== undefined) {
          const response = JSON.stringify({ claims });
          store.capture(scope, id, undefined, response);
          generated = completeResumeGeneration(selection, response);
        } else {
          generated = await generateResume(selection, {
            model,
            forms,
            onResponse: (request, response) =>
              store.capture(scope, id, request, response),
          });
        }
      }
      store.assertCurrent(scope, generationId);
      if (!isPdf)
        return {
          ok: true,
          text: JSON.stringify({ ...generated, generationId }),
        };
      if (
        !("resume" in generated) ||
        !generated.resume.trim() ||
        !("claims" in generated)
      )
        return { ok: false, code: "INCOMPLETE_RESUME", generationId };
      if (generated.gaps.length || generated.conflicts.length)
        return { ok: false, code: "UNVERIFIED_CLAIMS", generationId };
      const pdf = await createResumePdf({
        resume: generated.resume,
        claims: generated.claims,
        selection: generated.selection,
      });
      store.assertCurrent(scope, generationId);
      return {
        ok: true,
        text: "이력서 PDF를 생성했습니다.",
        content: [
          { type: "text", text: "이력서 PDF를 생성했습니다." },
          {
            type: "resource",
            resource: {
              uri: `resume://generated/${generationId}.pdf`,
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
      return {
        ok: false,
        code: error.code,
        ...(generationId ? { generationId } : {}),
      };
    }
    if (generationId)
      return {
        ok: false,
        code:
          name === "convert_resume_to_pdf"
            ? "PDF_GENERATION_FAILED"
            : "GENERATION_FAILED",
        generationId,
      };
    throw error;
  }
};
