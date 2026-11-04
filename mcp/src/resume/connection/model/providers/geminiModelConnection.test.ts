import {
  fetchGeminiModelResult,
  fetchGeminiModelText,
} from "@mcp/resume/connection/model/providers/geminiModelConnection";

const input = { persona: "test", prompt: "ok" };
const options = {
  url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
  token: "fake-key",
  model: "test-model",
};

describe("Gemini 공급자 어댑터", () => {
  it("일반·구조화 요청을 보내면 공급자 전용 필드 없이 문장과 원문을 반환한다", async () => {
    const raw = { choices: [{ message: { content: "ok" } }] };
    const fetchImpl = jest.fn(async (_url: string, _init: RequestInit) => ({
      ok: true,
      json: async () => raw,
    }));
    const responseFormat = {
      type: "json_schema" as const,
      json_schema: {
        name: "test",
        strict: true as const,
        schema: {
          type: "object",
          properties: { status: { type: "string" } },
          required: ["status"],
          additionalProperties: false,
        },
      },
    };
    await expect(
      fetchGeminiModelResult(input, { ...options, fetchImpl }),
    ).resolves.toEqual({ text: "ok", raw });
    await expect(
      fetchGeminiModelText(
        { ...input, responseFormat },
        { ...options, fetchImpl },
      ),
    ).resolves.toBe("ok");
    expect(fetchImpl.mock.calls[0][0]).toBe(options.url);
    expect(fetchImpl.mock.calls[0][1]).toMatchObject({
      method: "POST",
      headers: {
        authorization: "Bearer fake-key",
        "content-type": "application/json",
      },
    });
    const body = {
      model: "test-model",
      messages: [
        { role: "system", content: "test" },
        { role: "user", content: "ok" },
      ],
    };
    expect(JSON.parse(String(fetchImpl.mock.calls[0][1].body))).toEqual(body);
    expect(JSON.parse(String(fetchImpl.mock.calls[1][1].body))).toEqual({
      ...body,
      response_format: responseFormat,
    });
  });

  it("실패 상태이면 오류 본문을 읽지 않고 공통 오류 코드를 반환한다", async () => {
    for (const [status, code] of [
      [401, "MODEL_AUTH_FAILED"],
      [403, "MODEL_AUTH_FAILED"],
      [429, "MODEL_PROVIDER_ERROR"],
      [500, "MODEL_PROVIDER_ERROR"],
      [503, "MODEL_PROVIDER_ERROR"],
      [400, "MODEL_REJECTED"],
      [undefined, "MODEL_REJECTED"],
    ] as const) {
      const json = jest.fn();
      await expect(
        fetchGeminiModelResult(input, {
          ...options,
          fetchImpl: async () => ({ ok: false, status, json }),
        }),
      ).rejects.toMatchObject({ code });
      expect(json).not.toHaveBeenCalled();
    }
  });

  it("필수 설정이 비어 있으면 네트워크 호출 없이 종료한다", async () => {
    const fetchImpl = jest.fn();
    for (const field of ["url", "token", "model"]) {
      await expect(
        fetchGeminiModelResult(input, { ...options, [field]: "  ", fetchImpl }),
      ).rejects.toMatchObject({ code: "MISSING_MODEL_CONNECTION" });
    }
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("JSON이나 문장이 유효하지 않으면 요청 거부 코드를 반환한다", async () => {
    for (const payload of [
      null,
      [],
      {},
      { choices: null },
      { choices: [null] },
      { choices: [{ message: { content: " " } }] },
      { choices: [{ message: { content: [] } }] },
    ]) {
      await expect(
        fetchGeminiModelResult(input, {
          ...options,
          fetchImpl: async () => ({ ok: true, json: async () => payload }),
        }),
      ).rejects.toMatchObject({ code: "MODEL_REJECTED" });
    }
    await expect(
      fetchGeminiModelResult(input, {
        ...options,
        fetchImpl: async () => ({
          ok: true,
          json: async () => {
            throw new SyntaxError("invalid");
          },
        }),
      }),
    ).rejects.toMatchObject({ code: "MODEL_REJECTED" });
  });
});
