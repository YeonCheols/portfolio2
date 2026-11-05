import { fetchResumeModel } from "@mcp/infrastructure/portfolio-api/resume-connection";
import { ResumeConnectionError } from "@mcp/infrastructure/connection/connection";

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

  it("연결 응답에 오류 코드가 없거나 JSON이 아니면 원문 없이 고정 코드로 거절한다", async () => {
    const options = (fetchImpl: jest.Mock) => ({
      url: "https://resume.example/api/resume-model",
      token: "connection-token",
      fetchImpl,
    });

    // 연결 주소가 잘못되면 NestJS 같은 서버가 ok·code 없는 404 본문을 준다
    const noCode = jest.fn(async () => ({
      ok: false,
      status: 404,
      json: async () => ({ message: "Cannot POST", statusCode: 404 }),
    }));
    await expect(
      fetchResumeModel({ source: "repository" }, options(noCode)),
    ).rejects.toMatchObject({
      name: "ResumeConnectionError",
      code: "CONNECTION_FAILED",
    });

    const notJson = jest.fn(async () => ({
      ok: false,
      status: 502,
      json: async () => {
        throw new SyntaxError("<html>secret upstream page</html>");
      },
    }));
    const rejected = await fetchResumeModel(
      { source: "repository" },
      options(notJson),
    ).catch((error: unknown) => error);
    expect(rejected).toBeInstanceOf(ResumeConnectionError);
    expect((rejected as ResumeConnectionError).code).toBe("CONNECTION_FAILED");
    expect(String((rejected as Error).message)).not.toContain("secret");
  });
});
