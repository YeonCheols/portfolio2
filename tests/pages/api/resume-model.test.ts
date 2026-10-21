import type { NextApiRequest } from "next";

import handler from "@/pages/api/resume-model";
import { readResumeModel } from "@/entities/resume";

jest.mock("@/entities/resume", () => ({
  readResumeModel: jest.fn(),
}));

const mockedRead = readResumeModel as jest.MockedFunction<
  typeof readResumeModel
>;

const createResponse = () => {
  const res = {
    statusCode: 0,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
  };

  return res;
};

describe("resume model API", () => {
  const originalToken = process.env.RESUME_CONNECTION_TOKEN;

  beforeEach(() => {
    mockedRead.mockReset();
    process.env.RESUME_CONNECTION_TOKEN = "connection-token";
  });

  afterAll(() => {
    process.env.RESUME_CONNECTION_TOKEN = originalToken;
  });

  it("토큰이 없으면 입력 XML을 응답에 남기지 않고 거부한다", async () => {
    const res = createResponse();

    await handler(
      {
        method: "POST",
        headers: {},
        body: { source: "embedded", xml: "hidden@example.com" },
      } as NextApiRequest,
      res as never,
    );

    expect(res.statusCode).toBe(401);
    expect(JSON.stringify(res.body)).not.toContain("hidden@example.com");
    expect(mockedRead).not.toHaveBeenCalled();
  });

  it("인증된 요청은 엔티티 연결 결과만 반환한다", async () => {
    mockedRead.mockReturnValue({
      ok: true,
      model: { id: "resume-test" } as never,
    });
    const res = createResponse();

    await handler(
      {
        method: "POST",
        headers: { authorization: "Bearer connection-token" },
        body: { source: "file", xml: "<resumeAsset />" },
      } as NextApiRequest,
      res as never,
    );

    expect(mockedRead).toHaveBeenCalledWith({
      source: "file",
      xml: "<resumeAsset />",
    });
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      ok: true,
      model: { id: "resume-test" },
    });
  });
});
