import { fetchOpenRouterModelText } from "@mcp/resume/connection/openRouterModelConnection";
import { ResumeConnectionError } from "@mcp/resume/connection/resumeConnection";

describe("fetchOpenRouterModelText", () => {
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
