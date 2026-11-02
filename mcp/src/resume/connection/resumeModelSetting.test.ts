import { fetchActiveResumeModelSetting } from "@mcp/resume/connection/resumeModelSetting";

const active = {
  provider: "openrouter",
  modelName: "vendor/model",
  url: "https://openrouter.ai/api/v1/chat/completions",
  secretRef: "RESUME_MODEL_TOKEN_OPENROUTER",
};

const respond = (status: number, body: unknown) =>
  jest.fn<
    Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>,
    [string, RequestInit]
  >(async () => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }));

describe("fetchActiveResumeModelSetting", () => {
  it("환경 이름과 조회 전용 토큰으로 활성 설정 네 필드를 읽는다", async () => {
    const fetchImpl = respond(200, active);

    await expect(
      fetchActiveResumeModelSetting({
        url: "https://api.example/resume-model-setting/active",
        token: "read-token",
        environment: "production",
        fetchImpl,
      }),
    ).resolves.toEqual(active);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api.example/resume-model-setting/active?environment=production",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          authorization: "Bearer read-token",
        }),
      }),
    );
  });

  it.each([400, 401, 500])(
    "조회가 %i로 거부되면 MODEL_SETTING_REJECTED로 실패한다",
    async (status) => {
      const fetchImpl = respond(status, active);

      await expect(
        fetchActiveResumeModelSetting({
          url: "https://api.example/resume-model-setting/active",
          token: "read-token",
          environment: "production",
          fetchImpl,
        }),
      ).rejects.toMatchObject({ code: "MODEL_SETTING_REJECTED" });
    },
  );

  it("활성 설정이 없어 404이면 MODEL_SETTING_NOT_FOUND로 실패한다", async () => {
    const fetchImpl = respond(404, { message: "활성 모델 설정이 없습니다" });

    await expect(
      fetchActiveResumeModelSetting({
        url: "https://api.example/resume-model-setting/active",
        token: "read-token",
        environment: "production",
        fetchImpl,
      }),
    ).rejects.toMatchObject({ code: "MODEL_SETTING_NOT_FOUND" });
  });

  it.each([
    ["본문이 null", null],
    ["필드가 모두 없음", {}],
    ["secretRef가 없음", { ...active, secretRef: undefined }],
    ["modelName이 공백", { ...active, modelName: "  " }],
    ["provider가 숫자", { ...active, provider: 1 }],
    ["url이 https가 아님", { ...active, url: "http://openrouter.ai/api" }],
    ["url이 주소가 아님", { ...active, url: "not a url" }],
  ])(
    "응답이 계약에 맞지 않으면(%s) MODEL_SETTING_INVALID로 실패한다",
    async (_label, body) => {
      const fetchImpl = respond(200, body);

      await expect(
        fetchActiveResumeModelSetting({
          url: "https://api.example/resume-model-setting/active",
          token: "read-token",
          environment: "production",
          fetchImpl,
        }),
      ).rejects.toMatchObject({ code: "MODEL_SETTING_INVALID" });
    },
  );

  it("네트워크 오류는 원본 메시지 없이 MODEL_SETTING_UNAVAILABLE로 실패한다", async () => {
    const fetchImpl = jest.fn<Promise<never>, [string, RequestInit]>(
      async () => {
        throw new Error("connect ECONNREFUSED Bearer read-token");
      },
    );

    const failure = fetchActiveResumeModelSetting({
      url: "https://api.example/resume-model-setting/active",
      token: "read-token",
      environment: "production",
      fetchImpl,
    });

    await expect(failure).rejects.toMatchObject({
      code: "MODEL_SETTING_UNAVAILABLE",
    });
    await expect(failure).rejects.not.toThrow(/read-token/);
  });

  it("응답 본문이 JSON이 아니면 MODEL_SETTING_INVALID로 실패한다", async () => {
    const fetchImpl = jest.fn<
      Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>,
      [string, RequestInit]
    >(async () => ({
      ok: true,
      status: 200,
      json: async () => {
        throw new SyntaxError("Unexpected token < in JSON");
      },
    }));

    await expect(
      fetchActiveResumeModelSetting({
        url: "https://api.example/resume-model-setting/active",
        token: "read-token",
        environment: "production",
        fetchImpl,
      }),
    ).rejects.toMatchObject({ code: "MODEL_SETTING_INVALID" });
  });
});
