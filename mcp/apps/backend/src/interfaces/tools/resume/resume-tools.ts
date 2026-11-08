import { composeResume } from "@mcp/modules/resume/compose/compose-resume";
import type { ResumeConnectionInput } from "@mcp/infrastructure/portfolio-api/resume-connection";
import type {
  ResumeModel,
  ResumeXmlNode,
} from "@mcp/modules/resume/model/resume-model";
import {
  isResumeTemplate,
  type ResumeTemplate,
} from "@mcp/modules/resume/model/resume-template";
import { assertResumePdfReady } from "@mcp/modules/resume/validation/assert-resume-pdf-ready";
import {
  checkResumeDraft,
  type DraftClaim,
  type ResumeSelectionNode,
} from "@mcp/modules/resume/validation/check-resume-draft";
import { createResumePdf } from "@mcp/modules/resume/render/create-resume-pdf";
import {
  countResumePdfPages,
  evaluateResumePdfQuality,
} from "@mcp/modules/resume/quality/evaluate-resume-pdf";
import { applyResumeQualityReviews } from "@mcp/modules/resume/quality/apply-resume-quality-reviews";
import { assertResumePdfQualityReady } from "@mcp/modules/resume/quality/assert-resume-pdf-quality-ready";
import { previewResume } from "@mcp/modules/resume/render/preview-resume";
import {
  renderResumeForm,
  renderResumeFormSections,
} from "@mcp/modules/resume/render/render-resume-form";
import { renderResumeTemplate } from "@mcp/modules/resume/render/render-resume-template";
import { createResumeDebugAttempt } from "@mcp/modules/resume/archive/resume-debug-archive";
import type { ResumeGenerationContext } from "@mcp/modules/resume/generation/resume-generation-store";
import {
  generateResume,
  completeResumeGeneration,
  generatedResumePromptTitle,
  generatedResumeSectionNames,
  type ResumeModelClient,
} from "@mcp/modules/resume/generation/run-resume-harness";
import { selectTemplateSections } from "@mcp/modules/resume/compose/select-template-sections";
import { ResumeConnectionError } from "@mcp/infrastructure/connection/connection";

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
    ...(node.attributes.unit ? { unit: node.attributes.unit } : {}),
    ...(node.attributes.status === "superseded"
      ? { status: "superseded" as const }
      : {}),
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
  let debug: ReturnType<typeof createResumeDebugAttempt> | undefined;
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
        if (generation.storage) {
          debug = createResumeDebugAttempt(
            generation.storage,
            scope,
            generationId,
            name,
          );
          await debug.write("started", {
            snapshot: stored.snapshot,
            request: stored.request,
            response: stored.response,
            model: stored.model,
          });
        }
        if (stored.response === undefined || !stored.snapshot)
          throw new ResumeConnectionError("GENERATION_NOT_READY");
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
        if (generation.storage) {
          debug = createResumeDebugAttempt(
            generation.storage,
            scope,
            generationId,
            name,
          );
          await debug.write("started");
        }
        if (claims === undefined && !model)
          throw new ResumeConnectionError("MISSING_MODEL_CONNECTION");
        const { template, composed } = await loadTemplateResume(
          args,
          connection,
        );
        const selection = readGeneratedSelection(composed, template);
        const forms = generatedResumeForms(composed, template);
        store.snapshot(scope, generationId, { selection, forms });
        if (debug)
          await debug.write("source", { snapshot: { selection, forms } });
        const id = generationId;
        if (claims !== undefined) {
          const response = JSON.stringify({ claims });
          store.capture(scope, id, undefined, response);
          if (debug) await debug.write("model_response", { response });
          generated = completeResumeGeneration(selection, response);
        } else {
          generated = await generateResume(selection, {
            model: model
              ? {
                  generate: async (request) => {
                    if (debug) await debug.write("model_request", { request });
                    return model.generate(request, async (info) => {
                      store.captureModel(scope, id, info);
                      const safeModel = store.read(scope, id).model;
                      if (debug)
                        await debug.write("model_request", {
                          request,
                          model: safeModel,
                        });
                    });
                  },
                }
              : undefined,
            forms,
            onResponse: async (request, response) => {
              try {
                store.capture(scope, id, request, response);
              } catch (error) {
                if (debug)
                  await debug.write("model_response", { request, response });
                throw error;
              }
              if (debug)
                await debug.write("model_response", { request, response });
            },
          });
        }
      }
      if ("gaps" in generated) {
        if (debug)
          await debug.write("validation", {
            validation: {
              gaps: generated.gaps,
              conflicts: generated.conflicts,
              uncertain: generated.uncertain,
              validationIssues: generated.validationIssues,
              diagnostics: generated.diagnostics,
              status:
                generated.gaps.length || generated.conflicts.length
                  ? "blocked"
                  : "passed",
            },
          });
      }
      store.assertCurrent(scope, generationId);
      if (!isPdf) {
        if (debug) await debug.write("completed");
        store.assertCurrent(scope, generationId);
        return {
          ok: true,
          text: JSON.stringify({ ...generated, generationId }),
        };
      }
      if (!("resume" in generated) || !("claims" in generated))
        throw new ResumeConnectionError("INCOMPLETE_RESUME");
      assertResumePdfReady(generated);
      const pdf = await createResumePdf({
        resume: generated.resume,
        claims: generated.claims,
        selection: generated.selection,
      });
      const qualityEvaluation = evaluateResumePdfQuality({
        generated,
        evaluationId: `${generationId}-pdf-quality`,
        evaluatedAt: new Date().toISOString(),
        inputRef: generationId,
        outputRef: `${generationId}-pdf`,
        pdfPageCount: countResumePdfPages(pdf),
      });
      let reviewedEvaluation = qualityEvaluation;
      if (generation.qualityReviews) {
        let reviews;
        try {
          reviews = await generation.qualityReviews.load({
            environment: scope.environment,
            subject: scope.subject,
            generationId,
            evaluation: qualityEvaluation.run,
          });
        } catch {
          throw new ResumeConnectionError("QUALITY_REVIEW_STORAGE_FAILED");
        }
        reviewedEvaluation = applyResumeQualityReviews(
          qualityEvaluation,
          reviews,
        );
      }
      if (debug)
        await debug.write("quality_evaluation", {
          qualityEvaluation: reviewedEvaluation,
        });
      assertResumePdfQualityReady(reviewedEvaluation);
      if (debug) await debug.write("pdf");
      if (debug) await debug.write("completed");
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
    if (
      debug &&
      !(
        error instanceof ResumeConnectionError &&
        error.code === "DEBUG_STORAGE_FAILED"
      )
    ) {
      const errorCode =
        error instanceof ResumeConnectionError
          ? error.code
          : name === "convert_resume_to_pdf"
            ? "PDF_GENERATION_FAILED"
            : "GENERATION_FAILED";
      try {
        await debug.write("failed", { errorCode });
      } catch {
        return {
          ok: false,
          code: "DEBUG_STORAGE_FAILED",
          ...(generationId ? { generationId } : {}),
        };
      }
    }
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
