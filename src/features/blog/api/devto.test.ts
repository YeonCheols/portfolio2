import axios from "axios";

import {
  getBlogComment,
  getBlogData,
  getBlogDetail,
  getBlogViews,
} from "@/features/blog/api/devto";

jest.mock("axios");

const mockedGet = axios.get as jest.MockedFunction<typeof axios.get>;

describe("devto API client", () => {
  beforeEach(() => {
    mockedGet.mockReset();
  });

  it("목록을 조회하면 페이지 크기와 같으면 다음 페이지가 있다고 한다", async () => {
    mockedGet.mockResolvedValue({
      status: 200,
      data: [{ id: 1 }, { id: 2 }],
    });

    const result = await getBlogData({ page: 2, per_page: 2 });

    expect(mockedGet).toHaveBeenCalledWith(
      "https://dev.to/api/articles/me?username=aulianza&page=2&per_page=2",
      { headers: { "api-key": process.env.DEVTO_KEY } },
    );
    expect(result).toEqual({
      status: 200,
      data: {
        posts: [{ id: 1 }, { id: 2 }],
        page: 2,
        per_page: 2,
        has_next: true,
      },
    });
  });

  it("목록 상태가 400 이상이면 빈 데이터를 반환한다", async () => {
    mockedGet.mockResolvedValue({ status: 401, data: { error: "no" } });

    const result = await getBlogData({});

    expect(result).toEqual({ status: 401, data: {} });
  });

  it("상세를 조회하면 글 데이터를 반환한다", async () => {
    mockedGet.mockResolvedValue({ status: 200, data: { id: 8, title: "글" } });

    const result = await getBlogDetail({ id: 8 });

    expect(mockedGet).toHaveBeenCalledWith(
      "https://dev.to/api/articles//8?username=aulianza",
      { headers: { "api-key": process.env.DEVTO_KEY } },
    );
    expect(result).toEqual({ status: 200, data: { id: 8, title: "글" } });
  });

  it("상세 상태가 400 이상이면 빈 데이터를 반환한다", async () => {
    mockedGet.mockResolvedValue({ status: 404, data: null });

    const result = await getBlogDetail({ id: 8 });

    expect(result).toEqual({ status: 404, data: {} });
  });

  it("댓글을 조회하면 댓글 목록을 반환한다", async () => {
    mockedGet.mockResolvedValue({ status: 200, data: [{ id_code: "c1" }] });

    const result = await getBlogComment({ post_id: "42" });

    expect(mockedGet).toHaveBeenCalledWith(
      "https://dev.to/api/comments/?a_id=42",
      { headers: { "api-key": process.env.DEVTO_KEY } },
    );
    expect(result).toEqual({ status: 200, data: [{ id_code: "c1" }] });
  });

  it("댓글 상태가 400 이상이면 빈 데이터를 반환한다", async () => {
    mockedGet.mockResolvedValue({ status: 500, data: [] });

    const result = await getBlogComment({ post_id: "42" });

    expect(result).toEqual({ status: 500, data: {} });
  });

  it("조회수를 찾으면 해당 글의 조회수를 반환한다", async () => {
    mockedGet.mockResolvedValue({
      status: 200,
      data: [
        { id: 1, page_views_count: 4 },
        { id: 2, page_views_count: 9 },
      ],
    });

    const result = await getBlogViews({ id: 2 });

    expect(mockedGet).toHaveBeenCalledWith(
      "https://dev.to/api/articles/me/all",
      {
        headers: { "api-key": process.env.DEVTO_KEY },
      },
    );
    expect(result).toEqual({ status: 200, data: { page_views_count: 9 } });
  });

  it("글이 없으면 조회수를 비워 반환한다", async () => {
    mockedGet.mockResolvedValue({
      status: 200,
      data: [{ id: 1, page_views_count: 4 }],
    });

    const result = await getBlogViews({ id: 9 });

    expect(result).toEqual({
      status: 200,
      data: { page_views_count: undefined },
    });
  });

  it("조회수 상태가 400 이상이면 빈 데이터를 반환한다", async () => {
    mockedGet.mockResolvedValue({ status: 403, data: [] });

    const result = await getBlogViews({ id: 1 });

    expect(result).toEqual({ status: 403, data: {} });
  });
});
