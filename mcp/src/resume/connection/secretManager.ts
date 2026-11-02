import {
  ResumeConnectionError,
  type ResumeConnectionFetch,
} from "@mcp/resume/connection/resumeConnection";

export type SecretManagerOptions = {
  fetchImpl?: ResumeConnectionFetch;
};

const metadataUrl = "http://metadata.google.internal/computeMetadata/v1";
const secretsApiUrl = "https://secretmanager.googleapis.com/v1";

// portfolio-api가 저장 전에 거르는 형식과 같다. URL 경로에 들어가므로 읽기 전에 한 번 더 막는다
const secretRefPattern = /^RESUME_MODEL_TOKEN[A-Za-z0-9_-]{0,237}$/;

const unavailable = () => new ResumeConnectionError("MODEL_SECRET_UNAVAILABLE");

// 원본 오류 메시지에 토큰이나 주소가 섞일 수 있어 어떤 실패도 코드만 전달한다
const get = async <T>(
  fetchImpl: ResumeConnectionFetch,
  url: string,
  headers: Record<string, string>,
  read: (
    response: Awaited<ReturnType<ResumeConnectionFetch>>,
  ) => Promise<T> | undefined,
): Promise<T> => {
  try {
    const response = await fetchImpl(url, { method: "GET", headers });
    if (response.ok !== true) throw unavailable();
    const body = read(response);
    if (body === undefined) throw unavailable();

    return await body;
  } catch {
    throw unavailable();
  }
};

const getJson = (
  fetchImpl: ResumeConnectionFetch,
  url: string,
  headers: Record<string, string>,
): Promise<unknown> => get(fetchImpl, url, headers, (res) => res.json());

// 메타데이터 서버의 project-id는 JSON이 아니라 일반 텍스트로 응답한다
const getText = (
  fetchImpl: ResumeConnectionFetch,
  url: string,
  headers: Record<string, string>,
): Promise<string> => get(fetchImpl, url, headers, (res) => res.text?.());

export const accessSecret = async (
  secretRef: string,
  options: SecretManagerOptions = {},
): Promise<string> => {
  if (!secretRefPattern.test(secretRef)) {
    throw new ResumeConnectionError("MODEL_SECRET_INVALID");
  }
  const fetchImpl = options.fetchImpl ?? fetch;
  const metadataHeaders = { "metadata-flavor": "Google" };
  const tokenBody = (await getJson(
    fetchImpl,
    `${metadataUrl}/instance/service-accounts/default/token`,
    metadataHeaders,
  )) as { access_token?: unknown } | null;
  const projectId = (
    await getText(
      fetchImpl,
      `${metadataUrl}/project/project-id`,
      metadataHeaders,
    )
  ).trim();
  if (typeof tokenBody?.access_token !== "string" || projectId === "") {
    throw unavailable();
  }
  const secretBody = (await getJson(
    fetchImpl,
    `${secretsApiUrl}/projects/${projectId}/secrets/${secretRef}/versions/latest:access`,
    { authorization: `Bearer ${tokenBody.access_token}` },
  )) as { payload?: { data?: unknown } } | null;
  const data = secretBody?.payload?.data;
  if (typeof data !== "string") throw unavailable();
  const value = Buffer.from(data, "base64").toString("utf8");
  if (value.trim() === "") throw unavailable();

  return value;
};
