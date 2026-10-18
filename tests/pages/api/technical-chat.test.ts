import type { NextApiRequest, NextApiResponse } from "next";

import handler from "@/pages/api/technical-chat";
import {
  sendMessageToSession,
  sendTechnicalMessage,
} from "@/features/chat/api/gemini";

jest.mock("@/features/chat/api/gemini", () => ({
  sendTechnicalMessage: jest.fn(),
  sendMessageToSession: jest.fn(),
}));

const mockedSend = sendTechnicalMessage as jest.MockedFunction<
  typeof sendTechnicalMessage
>;
const mockedSession = sendMessageToSession as jest.MockedFunction<
  typeof sendMessageToSession
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

describe("technical-chat API", () => {
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    mockedSend.mockReset();
    mockedSession.mockReset();
    jest.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    (process.env as { NODE_ENV?: string }).NODE_ENV = originalNodeEnv;
    jest.restoreAllMocks();
  });

  it("POST가 아니면 405를 반환한다", async () => {
    const res = createResponse();

    await handler(
      { method: "GET" } as NextApiRequest,
      res as unknown as NextApiResponse,
    );

    expect(res.statusCode).toBe(405);
    expect(res.body).toEqual({ error: "Method not allowed" });
  });

  it("질문이 없거나 문자열이 아니면 400을 반환한다", async () => {
    const res = createResponse();

    await handler(
      { method: "POST", body: { question: 1 } } as NextApiRequest,
      res as unknown as NextApiResponse,
    );

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: "질문이 필요합니다." });
    expect(console.error).toHaveBeenCalledWith(
      "잘못된 요청: 질문이 없거나 문자열이 아님",
    );
  });

  it("세션이 없으면 새 기술 메시지를 보내고 답변을 반환한다", async () => {
    mockedSend.mockResolvedValue({ reply: "답변", sessionId: "s-1" } as never);
    const res = createResponse();
    const context = { level: "beginner" as const, techStack: ["React"] };

    await handler(
      {
        method: "POST",
        body: { question: "안녕", context },
      } as NextApiRequest,
      res as unknown as NextApiResponse,
    );

    expect(mockedSend).toHaveBeenCalledWith("안녕", context);
    expect(mockedSession).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      reply: "답변",
      sessionId: "s-1",
      timestamp: expect.stringMatching(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
      ),
      question: "안녕",
    });
  });

  it("세션이 있으면 기존 세션으로 메시지를 보낸다", async () => {
    mockedSession.mockResolvedValue({
      reply: "이어서",
      sessionId: "s-9",
    } as never);
    const res = createResponse();

    await handler(
      {
        method: "POST",
        body: {
          question: "이어서 물어봐",
          sessionId: "s-9",
          context: { level: "beginner" },
        },
      } as NextApiRequest,
      res as unknown as NextApiResponse,
    );

    expect(mockedSession).toHaveBeenCalledWith("s-9", "이어서 물어봐");
    expect(mockedSend).not.toHaveBeenCalled();
    expect(res.body).toMatchObject({ reply: "이어서", sessionId: "s-9" });
  });

  it("질문이 100자를 넘으면 말줄임으로 잘라 반환한다", async () => {
    const question = "가".repeat(101);
    mockedSend.mockResolvedValue({ reply: "답변", sessionId: "s-1" } as never);
    const res = createResponse();

    await handler(
      { method: "POST", body: { question } } as NextApiRequest,
      res as unknown as NextApiResponse,
    );

    expect((res.body as { question: string }).question).toBe(
      `${"가".repeat(100)}...`,
    );
  });

  it("전송이 실패하면 500과 오류 메시지를 반환한다", async () => {
    const error = new Error("boom");
    mockedSend.mockRejectedValue(error);
    const res = createResponse();

    await handler(
      { method: "POST", body: { question: "안녕" } } as NextApiRequest,
      res as unknown as NextApiResponse,
    );

    expect(res.statusCode).toBe(500);
    expect(res.body).toMatchObject({
      error: "서버 오류가 발생했습니다.",
      message: "boom",
    });
    expect((res.body as { details?: string }).details).toBeUndefined();
  });

  it("개발 환경에서 실패하면 스택을 함께 반환한다", async () => {
    (process.env as { NODE_ENV?: string }).NODE_ENV = "development";
    const error = new Error("boom");
    mockedSend.mockRejectedValue(error);
    const res = createResponse();

    await handler(
      { method: "POST", body: { question: "안녕" } } as NextApiRequest,
      res as unknown as NextApiResponse,
    );

    expect((res.body as { details?: string }).details).toBe(error.stack);
  });

  it("Error가 아닌 실패면 Unknown error를 반환한다", async () => {
    mockedSend.mockRejectedValue("nope");
    const res = createResponse();

    await handler(
      { method: "POST", body: { question: "안녕" } } as NextApiRequest,
      res as unknown as NextApiResponse,
    );

    expect(res.statusCode).toBe(500);
    expect(res.body).toMatchObject({
      error: "서버 오류가 발생했습니다.",
      message: "Unknown error",
    });
  });
});
