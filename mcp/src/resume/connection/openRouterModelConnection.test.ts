import { fetchOpenRouterModelText } from "@mcp/resume/connection/openRouterModelConnection";
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
