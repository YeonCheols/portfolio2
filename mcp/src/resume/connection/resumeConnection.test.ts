import {
  ResumeConnectionError,
  fetchResumeModel,
} from "@mcp/resume/connection/resumeConnection";

describe("fetchResumeModel", () => {
  it("이력서 연결에서 모델 JSON만 받고 입력 XML은 오류에 남기지 않는다", async () => {
    const fetchImpl = jest.fn<
      Promise<{ json: () => Promise<unknown> }>,
      [string, RequestInit]
    >(async () => ({
      json: async () => ({ ok: true, model: { id: "from-connection" } }),
    }));

    const model = await fetchResumeModel(
      { source: "repository", xml: "hidden@example.com" },
      {
        url: "https://resume.example/api/resume-model",
        token: "connection-token",
        fetchImpl,
      },
    );

    expect(model).toEqual({ id: "from-connection" });
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://resume.example/api/resume-model",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          authorization: "Bearer connection-token",
        }),
      }),
    );

    fetchImpl.mockResolvedValueOnce({
      json: async () => ({ ok: false, code: "MALFORMED_XML" }),
    });

    await expect(
      fetchResumeModel(
        { source: "embedded", xml: "hidden@example.com" },
        {
          url: "https://resume.example/api/resume-model",
          token: "connection-token",
          fetchImpl,
        },
      ),
    ).rejects.toEqual(expect.any(ResumeConnectionError));
  });
});
