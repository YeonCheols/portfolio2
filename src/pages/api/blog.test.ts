import type { NextApiRequest, NextApiResponse } from "next";

import handler from "@/pages/api/blog";
import { getBlogList } from "@/features/blog/api/blog";

jest.mock("@/features/blog/api/blog", () => ({
  getBlogList: jest.fn(),
}));

const mockedGetBlogList = getBlogList as jest.MockedFunction<
  typeof getBlogList
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

describe("blog API", () => {
  beforeEach(() => {
    mockedGetBlogList.mockReset();
  });

  it("목록 조회에 성공하면 조회수 0을 붙여 반환한다", async () => {
    mockedGetBlogList.mockResolvedValue({
      data: {
        total_pages: 3,
        total_posts: 20,
        page: 3,
        per_page: 10,
        posts: [{ slug: "hello", title: "안녕" }],
        categories: [{ id: 0 }],
      },
    } as never);
    const res = createResponse();

    await handler(
      {
        query: { page: "3", per_page: "10", categories: "0", search: "0" },
      } as unknown as NextApiRequest,
      res as unknown as NextApiResponse,
    );

    expect(mockedGetBlogList).toHaveBeenCalledWith({
      page: 3,
      per_page: 10,
      categories: 0,
      search: "0",
    });
    expect(res.statusCode).toBe(200);
    expect(res.headers["Cache-Control"]).toBe(
      "public, s-maxage=60, stale-while-revalidate=30",
    );
    expect(res.body).toEqual({
      status: true,
      data: {
        total_pages: 3,
        total_posts: 20,
        page: 3,
        per_page: 10,
        posts: [{ slug: "hello", title: "안녕", total_views_count: 0 }],
        categories: [{ id: 0 }],
      },
    });
  });

  it("page나 per_page가 비어 있으면 1과 9를 사용한다", async () => {
    mockedGetBlogList.mockResolvedValue({
      data: { posts: [], total_pages: 0, total_posts: 0, page: 1, per_page: 9 },
    } as never);
    const res = createResponse();

    await handler(
      { query: { page: "0", per_page: "foo" } } as unknown as NextApiRequest,
      res as unknown as NextApiResponse,
    );

    expect(mockedGetBlogList).toHaveBeenCalledWith({
      page: 1,
      per_page: 9,
      categories: undefined,
      search: undefined,
    });
  });

  it("게시글이 없으면 200과 실패 상태를 반환한다", async () => {
    mockedGetBlogList.mockResolvedValue({ data: {} } as never);
    const res = createResponse();

    await handler(
      { query: {} } as unknown as NextApiRequest,
      res as unknown as NextApiResponse,
    );

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ status: false });
    expect((res.body as { error: unknown }).error).toBeInstanceOf(TypeError);
  });

  it("목록 조회가 실패하면 200과 실패 상태를 반환한다", async () => {
    const error = new Error("blog down");
    mockedGetBlogList.mockRejectedValue(error);
    const res = createResponse();

    await handler(
      { query: {} } as unknown as NextApiRequest,
      res as unknown as NextApiResponse,
    );

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ status: false, error });
  });
});
