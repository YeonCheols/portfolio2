import type { NextApiRequest, NextApiResponse } from "next";

import handler from "@/pages/api/chat";
import { postChatPrompt } from "@/features/cmdpallete/api/chatgpt";

jest.mock("@/features/cmdpallete/api/chatgpt", () => ({
  postChatPrompt: jest.fn(),
}));

const mockedPrompt = postChatPrompt as jest.MockedFunction<
  typeof postChatPrompt
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

describe("chat API", () => {
  beforeEach(() => {
    mockedPrompt.mockReset();
  });

  it("프롬프트가 성공하면 200과 답변을 반환한다", async () => {
    mockedPrompt.mockResolvedValue({
      status: 200,
      data: { choices: [{ text: "안녕하세요" }] },
    } as never);
    const res = createResponse();

    await handler(
      { body: { prompt: "질문" } } as NextApiRequest,
      res as unknown as NextApiResponse,
    );

    expect(mockedPrompt).toHaveBeenCalledWith("질문");
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ reply: "안녕하세요" });
  });

  it("선택지가 없으면 500을 반환한다", async () => {
    mockedPrompt.mockResolvedValue({ status: 200, data: {} } as never);
    const res = createResponse();

    await handler(
      { body: { prompt: "질문" } } as NextApiRequest,
      res as unknown as NextApiResponse,
    );

    expect(res.statusCode).toBe(500);
    expect((res.body as { error: unknown }).error).toBeInstanceOf(TypeError);
  });

  it("상위 상태가 400 이상이면 그 상태와 오류를 반환한다", async () => {
    mockedPrompt.mockResolvedValue({
      status: 400,
      message: "bad prompt",
    } as never);
    const res = createResponse();

    await handler(
      { body: { prompt: "질문" } } as NextApiRequest,
      res as unknown as NextApiResponse,
    );

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: "bad prompt" });
  });

  it("프롬프트 호출이 실패하면 500을 반환한다", async () => {
    const error = new Error("openai down");
    mockedPrompt.mockRejectedValue(error);
    const res = createResponse();

    await handler(
      { body: { prompt: "질문" } } as NextApiRequest,
      res as unknown as NextApiResponse,
    );

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error });
  });
});
