import { resumeTemplateNames } from "@mcp/resume/model/resumeTemplate";
import type { ResumeModelClient } from "@mcp/resume/output/runResumeHarness";
import {
  callResumeTool,
  type ResumeConnection,
} from "@mcp/resume/tools/resumeTools";

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
        },
        required: ["text", "sourceIds"],
      },
    },
  },
  required: ["source", "elementIds", "sectionOrder", "template", "claims"],
};

const generateInputSchema = {
  type: "object",
  allOf: templateInputSchema.allOf,
  properties: {
    source: templateInputSchema.properties.source,
    xml: templateInputSchema.properties.xml,
    elementIds: templateInputSchema.properties.elementIds,
    sectionOrder: templateInputSchema.properties.sectionOrder,
    template: { type: "string", enum: [...resumeTemplateNames] },
    interpretation: { type: "string" },
    claims: draftInputSchema.properties.claims,
  },
  required: ["source", "elementIds", "sectionOrder", "template"],
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

const resumePdfInputSchema = {
  type: "object",
  allOf: templateInputSchema.allOf,
  properties: {
    source: templateInputSchema.properties.source,
    xml: templateInputSchema.properties.xml,
    elementIds: templateInputSchema.properties.elementIds,
    sectionOrder: templateInputSchema.properties.sectionOrder,
    template: templateInputSchema.properties.template,
    generatedResume: {
      type: "string",
      description: "generate_resume 도구가 반환한 JSON 문자열",
    },
  },
  required: [
    "source",
    "elementIds",
    "sectionOrder",
    "template",
    "generatedResume",
  ],
};

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
      "어떤 AI든 같은 작성자 역할로 양식의 각 섹션을 다시 쓰게 하고, 받은 문장을 검사해 최종 본문을 만든다",
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
    description: "generate_resume 결과를 PDF 바이너리 리소스로 변환한다",
    inputSchema: resumePdfInputSchema,
  },
];

export const handleMcpRequest = async (
  request: McpJsonRpcRequest,
  connection: ResumeConnection,
  model?: ResumeModelClient,
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
    );
    return {
      jsonrpc: "2.0" as const,
      id,
      result: {
        content: result.ok
          ? "content" in result
            ? result.content
            : [{ type: "text" as const, text: result.text }]
          : [{ type: "text" as const, text: result.code }],
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
