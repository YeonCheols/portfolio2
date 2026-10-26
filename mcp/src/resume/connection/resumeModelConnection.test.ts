import { ResumeConnectionError } from "@mcp/resume/connection/resumeConnection";
import { fetchResumeModelText } from "@mcp/resume/connection/resumeModelConnection";

describe("fetchResumeModelText", () => {
  it("주소나 토큰이 없으면 외부 AI를 호출하지 않는다", async () => {
    const fetchImpl = jest.fn<
      Promise<{ json: () => Promise<unknown> }>,
      [string, RequestInit]
    >(async () => ({ json: async () => ({ ok: true, text: "생성 문장" }) }));

    await expect(
      fetchResumeModelText(
        { persona: "이력서 전문 작성자", prompt: "원소를 해석한다" },
        { url: "", token: "", fetchImpl },
      ),
    ).rejects.toMatchObject({ code: "MISSING_MODEL_CONNECTION" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("주소나 토큰이 공백이면 외부 AI를 호출하지 않는다", async () => {
    const fetchImpl = jest.fn<
      Promise<{ json: () => Promise<unknown> }>,
      [string, RequestInit]
    >(async () => ({ json: async () => ({ ok: true, text: "생성 문장" }) }));

    await expect(
      fetchResumeModelText(
        { persona: "이력서 전문 작성자", prompt: "원소를 해석한다" },
        { url: "  ", token: "  ", fetchImpl },
      ),
    ).rejects.toMatchObject({ code: "MISSING_MODEL_CONNECTION" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("외부 AI 연결은 역할과 프롬프트를 보내고 생성된 문장만 받는다", async () => {
    const fetchImpl = jest.fn<
      Promise<{ json: () => Promise<unknown> }>,
      [string, RequestInit]
    >(async () => ({
      json: async () => ({ ok: true, text: "생성 문장" }),
    }));

    const text = await fetchResumeModelText(
      { persona: "이력서 전문 작성자", prompt: "원소를 해석한다" },
      {
        url: "https://model.example/generate",
        token: "model-token",
        fetchImpl,
      },
    );

    expect(text).toBe("생성 문장");
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://model.example/generate",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          authorization: "Bearer model-token",
          "content-type": "application/json",
        }),
        body: JSON.stringify({
          persona: "이력서 전문 작성자",
          prompt: "원소를 해석한다",
        }),
      }),
    );
    expect(JSON.stringify(fetchImpl.mock.calls)).not.toContain("gemini");

    fetchImpl.mockResolvedValueOnce({
      json: async () => ({ ok: false, code: "MODEL_REJECTED" }),
    });

    await expect(
      fetchResumeModelText(
        { persona: "이력서 전문 작성자", prompt: "비밀 프롬프트" },
        {
          url: "https://model.example/generate",
          token: "model-token",
          fetchImpl,
        },
      ),
    ).rejects.toEqual(expect.any(ResumeConnectionError));
  });
});
