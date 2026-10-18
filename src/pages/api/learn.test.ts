import type { NextApiRequest, NextApiResponse } from "next";

import handler from "@/pages/api/learn";
import { getMdxFileCount } from "@/shared/lib/mdx";

jest.mock("@/shared/lib/mdx", () => ({
  getMdxFileCount: jest.fn(),
}));

const mockedCount = getMdxFileCount as jest.MockedFunction<
  typeof getMdxFileCount
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

describe("learn API", () => {
  it("slug의 MDX 개수를 반환한다", async () => {
    mockedCount.mockReturnValue(3);
    const res = createResponse();

    await handler(
      { query: { slug: "react" } } as unknown as NextApiRequest,
      res as unknown as NextApiResponse,
    );

    expect(mockedCount).toHaveBeenCalledWith("react");
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ count: 3 });
  });
});
