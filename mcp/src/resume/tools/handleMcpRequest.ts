import { resumeTemplateNames } from "@mcp/resume/model/resumeTemplate";
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
  properties: {
    template: { type: "string", enum: [...resumeTemplateNames] },
  },
  required: ["template"],
};

const tools = [
  {
    name: "validate_resume_xml",
    description: "XML을 공통 이력서 모델로 검증한다",
    inputSchema: { type: "object" },
  },
  {
    name: "list_resume_elements",
    description: "이력서 원소의 식별자와 출처를 조회한다",
    inputSchema: { type: "object" },
  },
  {
    name: "preview_resume",
    description: "선택한 원소를 대표 템플릿 미리보기로 만든다",
    inputSchema: { type: "object" },
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
];

export const handleMcpRequest = async (
  request: McpJsonRpcRequest,
  connection: ResumeConnection,
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
    );
    return {
      jsonrpc: "2.0" as const,
      id,
      result: {
        content: [
          {
            type: "text" as const,
            text: result.ok ? result.text : result.code,
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
