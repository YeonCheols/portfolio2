import { request } from "../../../shared/api/request";

export type ToolDefinition = {
  name: string;
  description: string;
  inputSchema: unknown;
  // 서버가 도구마다 채워 둔 시험용 기본 입력. 없으면 빈 객체로 시작한다
  sampleArguments?: Record<string, unknown>;
};

const toolsUrl = "/admin/tools/resume/api/tools";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isTool = (value: unknown): value is ToolDefinition =>
  isRecord(value) &&
  typeof value.name === "string" &&
  typeof value.description === "string" &&
  "inputSchema" in value &&
  (value.sampleArguments === undefined || isRecord(value.sampleArguments));

export const listTools = async (
  signal?: AbortSignal,
): Promise<ToolDefinition[]> => {
  const body = await request(toolsUrl, { signal });
  if (
    !isRecord(body) ||
    !Array.isArray(body.tools) ||
    !body.tools.every(isTool)
  )
    throw new Error("도구 목록 형식이 올바르지 않습니다.");
  return body.tools;
};

export type ToolResultContent =
  | { type: "text"; text: string }
  | { type: "resource"; uri: string; mimeType: string; byteLength: number };

export type ToolCallResult = {
  isError: boolean;
  content: ToolResultContent[];
};

const isContent = (value: unknown): value is ToolResultContent =>
  isRecord(value) &&
  ((value.type === "text" && typeof value.text === "string") ||
    (value.type === "resource" &&
      typeof value.uri === "string" &&
      typeof value.mimeType === "string" &&
      typeof value.byteLength === "number"));

// 사용자가 실행 버튼을 눌렀을 때만 한 번 호출한다. 자동 재시도는 하지 않는다
export const callTool = async (
  name: string,
  args: Record<string, unknown>,
): Promise<ToolCallResult> => {
  const body = await request("/admin/tools/resume/api/call", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name, arguments: args }),
  });
  if (
    !isRecord(body) ||
    typeof body.isError !== "boolean" ||
    !Array.isArray(body.content) ||
    !body.content.every(isContent)
  )
    throw new Error("실행 결과 형식이 올바르지 않습니다.");
  return { isError: body.isError, content: body.content };
};
