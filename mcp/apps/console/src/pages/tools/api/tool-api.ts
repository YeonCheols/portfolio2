import { ApiError, request } from "../../../shared/api/request";

export type ToolDefinition = {
  name: string;
  description: string;
  inputSchema: unknown;
  // 서버가 도구마다 채워 둔 시험용 기본 입력. 없으면 빈 객체로 시작한다
  sampleArguments?: Record<string, unknown>;
  // 정책을 읽을 수 있을 때만 서버가 채운다. 없으면 활성 여부를 알 수 없다
  enabled?: boolean;
};

export type PolicyEnvironment = "development" | "production";

export type ToolList = {
  tools: ToolDefinition[];
  policyAvailable: boolean;
  // 서버가 읽고 쓰는 정책의 환경. 알리지 않으면 비어 있다
  environment?: PolicyEnvironment;
};

const toolsUrl = "/admin/tools/resume/api/tools";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isTool = (value: unknown): value is ToolDefinition =>
  isRecord(value) &&
  typeof value.name === "string" &&
  typeof value.description === "string" &&
  "inputSchema" in value &&
  (value.sampleArguments === undefined || isRecord(value.sampleArguments)) &&
  (value.enabled === undefined || typeof value.enabled === "boolean");

export const listTools = async (signal?: AbortSignal): Promise<ToolList> => {
  const body = await request(toolsUrl, { signal });
  if (
    !isRecord(body) ||
    !Array.isArray(body.tools) ||
    !body.tools.every(isTool)
  )
    throw new Error("도구 목록 형식이 올바르지 않습니다.");
  return {
    tools: body.tools,
    policyAvailable: body.policyAvailable === true,
    ...(body.environment === "development" || body.environment === "production"
      ? { environment: body.environment }
      : {}),
  };
};

// 사용자가 스위치를 눌렀을 때만 한 번 보낸다. 서버가 저장을 마친 뒤에만 화면 상태를 바꾼다
export const setToolEnabled = async (
  name: string,
  enabled: boolean,
): Promise<void> => {
  const body = await request("/admin/tools/resume/api/policy", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name, enabled }),
  });
  if (!isRecord(body) || body.enabled !== enabled)
    throw new Error("활성 상태 응답 형식이 올바르지 않습니다.");
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

export type ToolPreset = {
  id: string;
  label: string;
  arguments: Record<string, unknown>;
  createdAt: string;
};

const presetsUrl = "/admin/tools/resume/api/presets";

const isPreset = (value: unknown): value is ToolPreset =>
  isRecord(value) &&
  typeof value.id === "string" &&
  typeof value.label === "string" &&
  typeof value.createdAt === "string" &&
  isRecord(value.arguments);

export const listPresets = async (
  toolName: string,
  signal?: AbortSignal,
): Promise<ToolPreset[]> => {
  const body = await request(
    `${presetsUrl}?tool=${encodeURIComponent(toolName)}`,
    { signal },
  );
  if (
    !isRecord(body) ||
    !Array.isArray(body.presets) ||
    !body.presets.every(isPreset)
  )
    throw new Error("프리셋 목록 형식이 올바르지 않습니다.");
  return body.presets;
};

// 사용자가 저장 버튼을 눌렀을 때만 한 번 보낸다
export const savePreset = async (
  toolName: string,
  label: string,
  args: Record<string, unknown>,
): Promise<ToolPreset> => {
  const body = await request(presetsUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ toolName, label, arguments: args }),
  });
  if (!isRecord(body) || !isPreset(body.preset))
    throw new Error("프리셋 저장 응답 형식이 올바르지 않습니다.");
  return body.preset;
};

export const deletePreset = async (
  toolName: string,
  id: string,
): Promise<void> => {
  await request(`${presetsUrl}/delete`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ toolName, id }),
  });
};

export { ApiError };
