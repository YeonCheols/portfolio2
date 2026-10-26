import { fetchOpenRouterModelText } from "@mcp/resume/connection/openRouterModelConnection";
import { ResumeConnectionError } from "@mcp/resume/connection/resumeConnection";

describe("fetchOpenRouterModelText", () => {
  it("응답 문장이 없으면 확정 본문으로 받지 않는다", async () => {
    const fetchImpl = jest.fn<
      Promise<{ json: () => Promise<unknown> }>,
      [string, RequestInit]
    >(async () => ({ json: async () => ({ choices: [] }) }));

    await expect(
      fetchOpenRouterModelText(
        { persona: "이력서 전문 작성자", prompt: "원소를 해석한다" },
        {
          url: "https://openrouter.ai/api/v1/chat/completions",
          token: "model-token",
          fetchImpl,
        },
      ),
    ).rejects.toEqual(expect.any(ResumeConnectionError));
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});
