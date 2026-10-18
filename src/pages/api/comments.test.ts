import type { NextApiRequest, NextApiResponse } from "next";

import handler from "@/pages/api/comments";
import { getBlogComment } from "@/features/blog/api/devto";

jest.mock("@/features/blog/api/devto", () => ({
  getBlogComment: jest.fn(),
}));

const mockedComment = getBlogComment as jest.MockedFunction<
  typeof getBlogComment
>;

const createResponse = () => {
  const res = {
    statusCode: 0,
    body: undefined as unknown,
    headers: {} as Record<string, string>,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
    setHeader(name: string, value: string) {
      this.headers[name] = value;
      return this;
    },
  };

  return res;
};

describe("comments API", () => {
  beforeEach(() => {
    mockedComment.mockReset();
  });

  it("댓글 조회에 성공하면 200과 데이터를 반환한다", async () => {
    mockedComment.mockResolvedValue({
      data: [{ id: 1, body: "댓글" }],
    } as never);
    const res = createResponse();

    await handler(
      { query: { post_id: "42" } } as unknown as NextApiRequest,
      res as unknown as NextApiResponse,
    );

    expect(mockedComment).toHaveBeenCalledWith({ post_id: "42" });
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ status: true, data: [{ id: 1, body: "댓글" }] });
    expect(res.headers["Cache-Control"]).toBe(
      "public, s-maxage=60, stale-while-revalidate=30",
    );
  });

  it("post_id가 없으면 문자열 undefined로 조회한다", async () => {
    mockedComment.mockResolvedValue({ data: [] } as never);
    const res = createResponse();

    await handler(
      { query: {} } as unknown as NextApiRequest,
      res as unknown as NextApiResponse,
    );

    expect(mockedComment).toHaveBeenCalledWith({ post_id: "undefined" });
  });

  it("댓글 조회가 실패하면 200과 실패 상태를 반환한다", async () => {
    const error = new Error("comment down");
    mockedComment.mockRejectedValue(error);
    const res = createResponse();

    await handler(
      { query: { post_id: "42" } } as unknown as NextApiRequest,
      res as unknown as NextApiResponse,
    );

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ status: false, error });
  });
});
