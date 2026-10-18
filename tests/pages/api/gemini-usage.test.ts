import type { NextApiRequest, NextApiResponse } from "next";

import handler from "@/pages/api/gemini-usage";

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

describe("gemini-usage API", () => {
  it("GET이 아니면 405를 반환한다", async () => {
    const res = createResponse();

    await handler(
      { method: "POST" } as NextApiRequest,
      res as unknown as NextApiResponse,
    );

    expect(res.statusCode).toBe(405);
    expect(res.body).toEqual({ message: "Method not allowed" });
  });

  it("GET이면 사용량 기능이 제거됐다는 안내를 반환한다", async () => {
    const res = createResponse();

    await handler(
      { method: "GET" } as NextApiRequest,
      res as unknown as NextApiResponse,
    );

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      message: "Gemini 사용량 조회 기능이 제거되었습니다.",
      note: "실제 사용량은 Google Cloud Console의 Billing Reports에서 확인하세요.",
      dataSource: "Google Cloud Console",
    });
  });
});
