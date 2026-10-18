import type { NextApiRequest, NextApiResponse } from "next";

import handler from "./comments";

const createResponse = () => {
  const res = {
    statusCode: 0,
    body: undefined as unknown,
    headers: {} as Record<string, string | string[]>,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
    setHeader(name: string, value: string | string[]) {
      this.headers[name] = value;
      return this;
    },
  };

  return res;
};

const callHandler = (
  req: Partial<NextApiRequest>,
  res: ReturnType<typeof createResponse>,
) => handler(req as NextApiRequest, res as unknown as NextApiResponse);

describe("guestbook comments API", () => {
  it("이름이나 메시지가 비어 있으면 400을 반환한다", async () => {
    const res = createResponse();

    await callHandler(
      { method: "POST", query: { id: "entry-1" }, body: { name: "연철" } },
      res,
    );

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      success: false,
      message: "이름과 메시지를 모두 입력해주세요.",
    });
  });

  it("이름이 50자를 넘으면 400을 반환한다", async () => {
    const res = createResponse();

    await callHandler(
      {
        method: "POST",
        query: { id: "entry-1" },
        body: { name: "가".repeat(51), message: "안녕" },
      },
      res,
    );

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      success: false,
      message: "이름은 50자 이하로 입력해주세요.",
    });
  });

  it("댓글이 300자를 넘으면 400을 반환한다", async () => {
    const res = createResponse();

    await callHandler(
      {
        method: "POST",
        query: { id: "entry-1" },
        body: { name: "연철", message: "가".repeat(301) },
      },
      res,
    );

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      success: false,
      message: "댓글은 300자 이하로 입력해주세요.",
    });
  });

  it("본문이 없으면 500을 반환한다", async () => {
    const res = createResponse();

    await callHandler(
      { method: "POST", query: { id: "entry-1" }, body: null },
      res,
    );

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({
      success: false,
      message: "댓글 작성 중 오류가 발생했습니다.",
    });
  });

  it("GET과 POST가 아니면 405를 반환한다", async () => {
    const res = createResponse();

    await callHandler({ method: "PUT", query: { id: "entry-1" } }, res);

    expect(res.statusCode).toBe(405);
    expect(res.headers.Allow).toEqual(["GET", "POST"]);
    expect(res.body).toEqual({
      success: false,
      message: "허용되지 않는 메서드입니다.",
    });
  });

  it("댓글을 작성하면 해당 방명록만 최신 순으로 반환하고 스크립트를 제거한다", async () => {
    const first = createResponse();
    await callHandler(
      {
        method: "POST",
        query: { id: "entry-1" },
        body: {
          name: "<script>alert(1)</script>연철",
          message: "첫째",
        },
        headers: { "user-agent": "jest-agent" },
        socket: { remoteAddress: "10.0.0.1" } as NextApiRequest["socket"],
      },
      first,
    );
    expect(first.statusCode).toBe(201);
    expect(first.body).toEqual({
      success: true,
      message: "댓글이 성공적으로 작성되었습니다.",
    });

    await new Promise((resolve) => setTimeout(resolve, 10));

    const second = createResponse();
    await callHandler(
      {
        method: "POST",
        query: { id: "entry-2" },
        body: { name: "다른 글", message: "다른 댓글" },
        headers: { "x-forwarded-for": "8.8.8.8", "user-agent": "other" },
        socket: { remoteAddress: "10.0.0.2" } as NextApiRequest["socket"],
      },
      second,
    );

    await new Promise((resolve) => setTimeout(resolve, 10));

    const third = createResponse();
    await callHandler(
      {
        method: "POST",
        query: { id: "entry-1" },
        body: { name: "둘째", message: "안녕<script>x</script>" },
        headers: { "x-forwarded-for": "9.9.9.9", "user-agent": "jest-agent-2" },
        socket: { remoteAddress: "10.0.0.3" } as NextApiRequest["socket"],
      },
      third,
    );

    const listed = createResponse();
    await callHandler({ method: "GET", query: { id: "entry-1" } }, listed);

    const data = (
      listed.body as {
        data: Array<{
          guestbookId: string;
          name: string;
          message: string;
          ip?: string;
        }>;
      }
    ).data;

    expect(listed.statusCode).toBe(200);
    expect(data.map((comment) => comment.name)).toEqual(["둘째", "연철"]);
    expect(data[0]).toMatchObject({
      guestbookId: "entry-1",
      message: "안녕",
      ip: "9.9.9.9",
    });
    expect(data[1]).toMatchObject({
      message: "첫째",
      ip: "10.0.0.1",
      userAgent: "jest-agent",
    });
  });
});
