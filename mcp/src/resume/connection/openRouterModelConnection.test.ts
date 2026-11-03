import {
  fetchOpenRouterModelResult,
  fetchOpenRouterModelText,
} from "@mcp/resume/connection/openRouterModelConnection";
import { ResumeConnectionError } from "@mcp/resume/connection/resumeConnection";

describe("fetchOpenRouterModelText", () => {
  it("구조화 응답 형식을 OpenRouter 요청 본문에 전달한다", async () => {
    const fetchImpl = jest.fn<
      Promise<{ ok: boolean; json: () => Promise<unknown> }>,
      [string, RequestInit]
    >(async () => ({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '{"claims":[]}' } }],
      }),
    }));
    const responseFormat = {
      type: "json_schema",
      json_schema: {
        name: "resume_claims",
        strict: true,
        schema: { type: "object" },
      },
    };

    await fetchOpenRouterModelText(
      {
        persona: "이력서 전문 작성자",
        prompt: "원소를 해석한다",
        responseFormat,
      },
      {
        url: "https://openrouter.ai/api/v1/chat/completions",
        token: "model-token",
        model: "vendor/model",
        fetchImpl,
      },
    );

    const request = JSON.parse(fetchImpl.mock.calls[0]?.[1]?.body as string);
    expect(request).toMatchObject({
      provider: { require_parameters: true },
      response_format: responseFormat,
    });
  });

  it("연결 테스트용으로 응답 문장과 공급자 응답 원문을 함께 돌려준다", async () => {
    const body = {
      id: "gen-1",
      model: "vendor/model",
      choices: [{ message: { content: "ok" } }],
      usage: { total_tokens: 12 },
    };
    const fetchImpl = jest.fn<
      Promise<{ ok: boolean; json: () => Promise<unknown> }>,
      [string, RequestInit]
    >(async () => ({ ok: true, json: async () => body }));

    const result = await fetchOpenRouterModelResult(
      { persona: "연결 테스트", prompt: "ok" },
      {
        url: "https://openrouter.ai/api/v1/chat/completions",
        token: "model-token",
        model: "vendor/model",
        fetchImpl,
      },
    );

    expect(result).toEqual({ text: "ok", raw: body });
  });

  it("응답 문장이 없으면 확정 본문으로 받지 않는다", async () => {
    const fetchImpl = jest.fn<
      Promise<{ json: () => Promise<unknown> }>,
      [string, RequestInit]
    >(async () => ({ ok: true, json: async () => ({ choices: [] }) }));

    await expect(
      fetchOpenRouterModelText(
        { persona: "이력서 전문 작성자", prompt: "원소를 해석한다" },
        {
          url: "https://openrouter.ai/api/v1/chat/completions",
          token: "model-token",
          model: "vendor/model",
          fetchImpl,
        },
      ),
    ).rejects.toEqual(expect.any(ResumeConnectionError));
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("실패 상태의 응답 문장은 확정 본문으로 받지 않는다", async () => {
    const fetchImpl = jest.fn<
      Promise<{ ok: boolean; json: () => Promise<unknown> }>,
      [string, RequestInit]
    >(async () => ({
      ok: false,
      json: async () => ({
        choices: [{ message: { content: "오류 문장" } }],
      }),
    }));

    await expect(
      fetchOpenRouterModelText(
        { persona: "이력서 전문 작성자", prompt: "원소를 해석한다" },
        {
          url: "https://openrouter.ai/api/v1/chat/completions",
          token: "model-token",
          model: "vendor/model",
          fetchImpl,
        },
      ),
    ).rejects.toEqual(expect.any(ResumeConnectionError));
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("공급자 응답 상태에 따라 인증 실패, 공급자 오류, 요청 거부 코드를 나눈다", async () => {
    const cases: Array<[number | undefined, string]> = [
      [401, "MODEL_AUTH_FAILED"],
      [403, "MODEL_AUTH_FAILED"],
      [429, "MODEL_PROVIDER_ERROR"],
      [500, "MODEL_PROVIDER_ERROR"],
      [502, "MODEL_PROVIDER_ERROR"],
      [503, "MODEL_PROVIDER_ERROR"],
      [400, "MODEL_REJECTED"],
      [402, "MODEL_REJECTED"],
      [404, "MODEL_REJECTED"],
      [422, "MODEL_REJECTED"],
      [undefined, "MODEL_REJECTED"],
    ];

    for (const [status, code] of cases) {
      const fetchImpl = jest.fn<
        Promise<{ ok: boolean; status?: number; json: () => Promise<unknown> }>,
        [string, RequestInit]
      >(async () => ({
        ok: false,
        status,
        json: async () => ({ error: { message: "공급자 원문 오류" } }),
      }));

      await expect(
        fetchOpenRouterModelResult(
          { persona: "연결 테스트", prompt: "ok" },
          {
            url: "https://openrouter.ai/api/v1/chat/completions",
            token: "model-token",
            model: "vendor/model",
            fetchImpl,
          },
        ),
      ).rejects.toMatchObject({ code });
    }
  });

  it("응답 본문이 JSON이 아니면 확정 본문으로 받지 않는다", async () => {
    const fetchImpl = jest.fn<
      Promise<{ ok: boolean; json: () => Promise<unknown> }>,
      [string, RequestInit]
    >(async () => ({
      ok: true,
      json: async () => {
        throw new SyntaxError("invalid");
      },
    }));

    await expect(
      fetchOpenRouterModelText(
        { persona: "이력서 전문 작성자", prompt: "원소를 해석한다" },
        {
          url: "https://openrouter.ai/api/v1/chat/completions",
          token: "model-token",
          model: "vendor/model",
          fetchImpl,
        },
      ),
    ).rejects.toEqual(expect.any(ResumeConnectionError));
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});
