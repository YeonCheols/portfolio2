import axios from "axios";

import { getBlogDetail, getBlogList } from "@/features/blog/api/blog";

jest.mock("axios");

const mockedGet = axios.get as jest.MockedFunction<typeof axios.get>;

describe("blog API client", () => {
  beforeEach(() => {
    mockedGet.mockReset();
  });

  it("목록을 조회하면 페이지 헤더와 글을 함께 반환한다", async () => {
    mockedGet.mockResolvedValue({
      status: 200,
      data: [{ id: 1 }],
      headers: { "x-wp-totalpages": "3", "x-wp-total": "14" },
      config: {
        params: { page: 2, per_page: 5, categories: 11, search: "next" },
      },
    });

    const result = await getBlogList({
      page: 2,
      per_page: 5,
      categories: 11,
      search: "next",
    });

    expect(mockedGet).toHaveBeenCalledWith(expect.stringContaining("posts"), {
      params: { page: 2, per_page: 5, categories: 11, search: "next" },
    });
    expect(result).toEqual({
      status: 200,
      data: {
        posts: [{ id: 1 }],
        page: 2,
        per_page: 5,
        total_pages: 3,
        total_posts: 14,
        categories: 11,
      },
    });
  });

  it("응답 헤더가 없으면 페이지 수를 0으로 둔다", async () => {
    mockedGet.mockResolvedValue({
      status: 200,
      data: [],
      headers: {},
      config: { params: {} },
    });

    const result = await getBlogList({});

    expect(result.data).toMatchObject({
      page: 1,
      per_page: 6,
      total_pages: 0,
      total_posts: 0,
    });
  });

  it("상세를 조회하면 본문을 반환한다", async () => {
    mockedGet.mockResolvedValue({
      status: 200,
      data: { id: 9, slug: "hello" },
    });

    const result = await getBlogDetail(9);

    expect(mockedGet).toHaveBeenCalledWith(expect.stringContaining("posts/9"));
    expect(result).toEqual({ status: 200, data: { id: 9, slug: "hello" } });
  });

  it("응답 에러면 그 상태와 데이터를 반환한다", async () => {
    mockedGet.mockRejectedValue({
      response: { status: 404, data: { message: "missing" } },
    });

    const result = await getBlogList({ page: 1 });

    expect(result).toEqual({ status: 404, data: { message: "missing" } });
  });

  it("네트워크 에러면 500을 반환한다", async () => {
    mockedGet.mockRejectedValue(new Error("network"));

    const result = await getBlogDetail(3);

    expect(result).toEqual({
      status: 500,
      data: { message: "Internal Server Error" },
    });
  });
});
