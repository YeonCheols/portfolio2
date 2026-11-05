import { resumeTemplateNames } from "@mcp/modules/resume/model/resume-template";
import type { ResumeGenerationContext } from "@mcp/modules/resume/generation/resume-generation-store";
import type { ResumeModelClient } from "@mcp/modules/resume/generation/run-resume-harness";
import {
  callResumeTool,
  type ResumeConnection,
} from "@mcp/interfaces/tools/resume/resume-tools";

export type McpJsonRpcRequest = {
  jsonrpc: "2.0";
  id?: number | string | null;
  method: string;
  params?: {
    name?: string;
    arguments?: Record<string, unknown>;
  };
};

const templateInputSchema = {
  type: "object",
  allOf: [
    {
      if: { properties: { source: { enum: ["embedded", "file"] } } },
      then: { required: ["xml"] },
    },
  ],
  properties: {
    source: { type: "string", enum: ["repository", "embedded", "file"] },
    xml: { type: "string" },
    elementIds: { type: "array", items: { type: "string" } },
    sectionOrder: { type: "array", items: { type: "string" } },
    template: { type: "string", enum: [...resumeTemplateNames] },
  },
  required: ["source", "elementIds", "sectionOrder", "template"],
};

const draftInputSchema = {
  type: "object",
  allOf: templateInputSchema.allOf,
  properties: {
    source: templateInputSchema.properties.source,
    xml: templateInputSchema.properties.xml,
    elementIds: templateInputSchema.properties.elementIds,
    sectionOrder: templateInputSchema.properties.sectionOrder,
    template: { type: "string", enum: [...resumeTemplateNames] },
    claims: {
      type: "array",
      items: {
        type: "object",
        properties: {
          text: { type: "string" },
          sourceIds: { type: "array", items: { type: "string" } },
          formItem: { type: "string" },
          evidence: {
            type: "array",
            items: {
              type: "object",
              properties: {
                sourceId: { type: "string" },
                quote: { type: "string" },
              },
              required: ["sourceId", "quote"],
              additionalProperties: false,
            },
          },
        },
        required: ["text", "sourceIds"],
      },
    },
  },
  required: ["source", "elementIds", "sectionOrder", "template", "claims"],
};

const generationReferenceSchema = {
  type: "object",
  properties: {
    generationId: {
      type: "string",
      minLength: 1,
      description: "generate_resume 응답 또는 오류의 생성 식별자",
    },
  },
  required: ["generationId"],
  additionalProperties: false,
};

const generateInputSchema = {
  oneOf: [
    {
      ...templateInputSchema,
      properties: {
        ...templateInputSchema.properties,
        claims: draftInputSchema.properties.claims,
      },
      additionalProperties: false,
    },
    generationReferenceSchema,
  ],
};

const sourceInputSchema = {
  type: "object",
  allOf: templateInputSchema.allOf,
  properties: {
    source: templateInputSchema.properties.source,
    xml: templateInputSchema.properties.xml,
  },
  required: ["source"],
};

const composeInputSchema = {
  type: "object",
  allOf: templateInputSchema.allOf,
  properties: {
    source: templateInputSchema.properties.source,
    xml: templateInputSchema.properties.xml,
    elementIds: templateInputSchema.properties.elementIds,
    sectionOrder: templateInputSchema.properties.sectionOrder,
  },
  required: ["source", "elementIds", "sectionOrder"],
};

const resumePdfInputSchema = generationReferenceSchema;

const tools = [
  {
    name: "validate_resume_xml",
    description: "XML을 공통 이력서 모델로 검증한다",
    inputSchema: sourceInputSchema,
  },
  {
    name: "list_resume_elements",
    description: "이력서 원소의 식별자와 출처를 조회한다",
    inputSchema: sourceInputSchema,
  },
  {
    name: "preview_resume",
    description: "선택한 원소를 대표 템플릿 미리보기로 만든다",
    inputSchema: composeInputSchema,
  },
  {
    name: "read_resume_selection",
    description: "선택한 원소의 식별자, 원문, 출처, 공개 여부를 반환한다",
    inputSchema: templateInputSchema,
  },
  {
    name: "check_resume_draft",
    description:
      "초안 문장의 근거를 선택 원소와 맞춰 누락, 충돌, 확인 대상을 반환한다",
    inputSchema: draftInputSchema,
  },
  {
    name: "generate_resume",
    description:
      "새 이력서는 모델을 1회 호출해 작성하고 원문 근거를 내부 검사한다. generationId만 보내면 보관된 원본으로 내부 검사만 재실행한다",
    inputSchema: generateInputSchema,
  },
  {
    name: "render_resume_template",
    description: "선택한 원소를 라벨이 있는 템플릿으로 출력한다",
    inputSchema: templateInputSchema,
  },
  {
    name: "render_resume_form",
    description: "선택한 원소를 이력서 양식으로 출력한다",
    inputSchema: templateInputSchema,
  },
  {
    name: "convert_resume_to_pdf",
    description:
      "generationId의 서버 보관 원본을 내부 검증하고 모델 호출 없이 PDF로 변환한다",
    inputSchema: resumePdfInputSchema,
  },
];

export const handleMcpRequest = async (
  request: McpJsonRpcRequest,
  connection: ResumeConnection,
  model?: ResumeModelClient,
  generation?: ResumeGenerationContext,
) => {
  const id = request.id ?? null;

  if (request.method === "initialize") {
    return {
      jsonrpc: "2.0" as const,
      id,
      result: {
        protocolVersion: "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: { name: "portfolio-resume", version: "0.1.0" },
      },
    };
  }

  if (request.method === "notifications/initialized") {
    return null;
  }

  if (request.method === "tools/list") {
    return { jsonrpc: "2.0" as const, id, result: { tools } };
  }

  if (request.method === "tools/call") {
    const result = await callResumeTool(
      request.params?.name ?? "",
      request.params?.arguments ?? {},
      connection,
      model,
      generation,
    );
    return {
      jsonrpc: "2.0" as const,
      id,
      result: {
        content: result.ok
          ? "content" in result
            ? result.content
            : [{ type: "text" as const, text: result.text }]
          : [
              {
                type: "text" as const,
                text: result.generationId
                  ? JSON.stringify({
                      code: result.code,
                      generationId: result.generationId,
                    })
                  : result.code,
              },
            ],
        isError: !result.ok,
      },
    };
  }

  return {
    jsonrpc: "2.0" as const,
    id,
    error: { code: -32601, message: "METHOD_NOT_FOUND" },
  };
};
