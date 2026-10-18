import type { NextApiRequest, NextApiResponse } from "next";

import handler from "@/pages/api/views";

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

describe("views API", () => {
  it("GET이면 slug와 상관없이 views 0을 반환한다", async () => {
    const res = createResponse();

    await handler(
      { method: "GET", query: { slug: "hello" } } as unknown as NextApiRequest,
      res as unknown as NextApiResponse,
    );

    expect(res.statusCode).toBe(0);
    expect(res.body).toEqual({ views: 0 });
  });

  it("POST이면 상태와 본문을 반환하지 않는다", async () => {
    const res = createResponse();

    await handler(
      { method: "POST", query: { slug: "hello" } } as unknown as NextApiRequest,
      res as unknown as NextApiResponse,
    );

    expect(res.statusCode).toBe(0);
    expect(res.body).toBeUndefined();
  });

  it("GET과 POST가 아니면 405를 반환한다", async () => {
    const res = createResponse();

    await handler(
      { method: "PUT", query: {} } as NextApiRequest,
      res as unknown as NextApiResponse,
    );

    expect(res.statusCode).toBe(405);
    expect(res.body).toEqual({ error: "Method not allowed" });
  });
});
