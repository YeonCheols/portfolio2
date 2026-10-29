import { accessSecret } from "@mcp/resume/connection/secretManager";

type Reply = { status: number; body: unknown };

const metadata = "http://metadata.google.internal/computeMetadata/v1";
const secretsApi = "https://secretmanager.googleapis.com/v1";

// 메타데이터 서버의 project-id처럼 문자열 본문은 JSON이 아니라 일반 텍스트다
const fakeCloud = (replies: Record<string, Reply>) =>
  jest.fn<
    Promise<{
      ok: boolean;
      status: number;
      json: () => Promise<unknown>;
      text: () => Promise<string>;
    }>,
    [string, RequestInit]
  >(async (url) => {
    const reply = replies[url] ?? { status: 404, body: {} };
    return {
      ok: reply.status >= 200 && reply.status < 300,
      status: reply.status,
      json: async () => {
        if (typeof reply.body === "string") {
          throw new SyntaxError("Unexpected token in JSON");
        }
        return reply.body;
      },
      text: async () =>
        typeof reply.body === "string"
          ? reply.body
          : JSON.stringify(reply.body),
    };
  });

const healthy = (): Record<string, Reply> => ({
  [`${metadata}/instance/service-accounts/default/token`]: {
    status: 200,
    body: { access_token: "metadata-access-token" },
  },
  [`${metadata}/project/project-id`]: { status: 200, body: "demo-project" },
  [`${secretsApi}/projects/demo-project/secrets/RESUME_MODEL_TOKEN_OPENROUTER/versions/latest:access`]:
    {
      status: 200,
      body: {
        payload: { data: Buffer.from("model-secret-value").toString("base64") },
      },
    },
});

describe("accessSecret", () => {
  it("메타데이터 서버 토큰으로 최신 버전을 읽어 디코딩한 값을 돌려준다", async () => {
    const fetchImpl = fakeCloud(healthy());

    await expect(
      accessSecret("RESUME_MODEL_TOKEN_OPENROUTER", { fetchImpl }),
    ).resolves.toBe("model-secret-value");
    expect(fetchImpl).toHaveBeenCalledWith(
      `${secretsApi}/projects/demo-project/secrets/RESUME_MODEL_TOKEN_OPENROUTER/versions/latest:access`,
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          authorization: "Bearer metadata-access-token",
        }),
      }),
    );
  });

  it.each([
    "",
    "OTHER_TOKEN",
    "RESUME_MODEL_TOKEN/../DATABASE_URL",
    "RESUME_MODEL_TOKEN x",
    "RESUME_MODEL_TOKEN?alt=media",
    "projects/p/secrets/RESUME_MODEL_TOKEN/versions/1",
    `RESUME_MODEL_TOKEN${"A".repeat(240)}`,
  ])(
    "시크릿 이름이 %p이면 요청을 보내지 않고 MODEL_SECRET_INVALID로 실패한다",
    async (secretRef) => {
      const fetchImpl = fakeCloud(healthy());

      await expect(
        accessSecret(secretRef, { fetchImpl }),
      ).rejects.toMatchObject({ code: "MODEL_SECRET_INVALID" });
      expect(fetchImpl).not.toHaveBeenCalled();
    },
  );

  const secretUrl = `${secretsApi}/projects/demo-project/secrets/RESUME_MODEL_TOKEN_OPENROUTER/versions/latest:access`;
  const tokenUrl = `${metadata}/instance/service-accounts/default/token`;
  const projectUrl = `${metadata}/project/project-id`;
  const base64 = (value: string) => Buffer.from(value).toString("base64");

  it.each<[string, string, Reply]>([
    ["시크릿 접근 거부", secretUrl, { status: 403, body: {} }],
    ["시크릿 없음", secretUrl, { status: 404, body: {} }],
    ["메타데이터 토큰 발급 실패", tokenUrl, { status: 500, body: {} }],
    ["프로젝트 id 조회 실패", projectUrl, { status: 500, body: "" }],
    ["프로젝트 id가 공백뿐임", projectUrl, { status: 200, body: " \n" }],
    ["응답에 payload가 없음", secretUrl, { status: 200, body: {} }],
    [
      "값이 비어 있음",
      secretUrl,
      { status: 200, body: { payload: { data: base64("") } } },
    ],
    [
      "값이 공백뿐임",
      secretUrl,
      { status: 200, body: { payload: { data: base64("   ") } } },
    ],
  ])(
    "%s이면 MODEL_SECRET_UNAVAILABLE로 실패한다",
    async (_label, url, reply) => {
      const fetchImpl = fakeCloud({ ...healthy(), [url]: reply });

      await expect(
        accessSecret("RESUME_MODEL_TOKEN_OPENROUTER", { fetchImpl }),
      ).rejects.toMatchObject({ code: "MODEL_SECRET_UNAVAILABLE" });
    },
  );

  it("네트워크 오류는 원본 메시지 없이 MODEL_SECRET_UNAVAILABLE로 실패한다", async () => {
    const fetchImpl = jest.fn<Promise<never>, [string, RequestInit]>(
      async () => {
        throw new Error("getaddrinfo ENOTFOUND metadata-access-token");
      },
    );

    const failure = accessSecret("RESUME_MODEL_TOKEN_OPENROUTER", {
      fetchImpl,
    });

    await expect(failure).rejects.toMatchObject({
      code: "MODEL_SECRET_UNAVAILABLE",
    });
    await expect(failure).rejects.not.toThrow(/metadata-access-token/);
  });
});
