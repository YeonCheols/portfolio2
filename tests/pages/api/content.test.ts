import type { NextApiRequest, NextApiResponse } from "next";

import handler from "@/pages/api/content";
import { loadMdxFiles } from "@/shared/lib/mdx";

jest.mock("@/shared/lib/mdx", () => ({
  loadMdxFiles: jest.fn(),
}));

const mockedLoad = loadMdxFiles as jest.MockedFunction<typeof loadMdxFiles>;

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

describe("content API", () => {
  beforeEach(() => {
    mockedLoad.mockReset();
  });

  it("카테고리의 MDX를 id와 제목 목록으로 반환한다", async () => {
    mockedLoad.mockReturnValue([
      { slug: "intro", frontMatter: { id: 1, title: "시작" }, content: "" },
      { slug: "", frontMatter: {}, content: "" },
    ] as never);
    const res = createResponse();

    await handler(
      { query: { category: "react" } } as unknown as NextApiRequest,
      res as unknown as NextApiResponse,
    );

    expect(mockedLoad).toHaveBeenCalledWith("react");
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      data: [
        { id: 1, parent_slug: "react", slug: "intro", title: "시작" },
        { id: undefined, parent_slug: "react", slug: "", title: "" },
      ],
    });
  });

  it("카테고리가 없으면 parent_slug를 빈 문자열로 반환한다", async () => {
    mockedLoad.mockReturnValue([
      { slug: "intro", frontMatter: { id: "1", title: "시작" }, content: "" },
    ] as never);
    const res = createResponse();

    await handler(
      { query: {} } as unknown as NextApiRequest,
      res as unknown as NextApiResponse,
    );

    expect(mockedLoad).toHaveBeenCalledWith(undefined);
    expect(res.body).toEqual({
      data: [{ id: "1", parent_slug: "", slug: "intro", title: "시작" }],
    });
  });

  it("frontMatter가 없으면 예외를 던진다", async () => {
    mockedLoad.mockReturnValue([{ slug: "only" }] as never);
    const res = createResponse();

    await expect(
      handler(
        { query: { category: "react" } } as unknown as NextApiRequest,
        res as unknown as NextApiResponse,
      ),
    ).rejects.toThrow(TypeError);
  });
});
