import type { NextApiRequest, NextApiResponse } from "next";

import handler from "@/pages/api/github";
import { getGithubUser } from "@/shared/api/github";

jest.mock("@/shared/api/github", () => ({
  getGithubUser: jest.fn(),
}));

const mockedUser = getGithubUser as jest.MockedFunction<typeof getGithubUser>;

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

describe("github API", () => {
  beforeEach(() => {
    mockedUser.mockReset();
    jest.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("문자열 type이면 그 값으로 사용자를 조회한다", async () => {
    mockedUser.mockResolvedValue({
      status: 200,
      data: { login: "octocat" },
    } as never);
    const res = createResponse();

    await handler(
      { query: { type: "personal" } } as unknown as NextApiRequest,
      res as unknown as NextApiResponse,
    );

    expect(mockedUser).toHaveBeenCalledWith("personal");
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ login: "octocat" });
  });

  it("type이 배열이면 첫 값으로 조회한다", async () => {
    mockedUser.mockResolvedValue({
      status: 200,
      data: { login: "octocat" },
    } as never);
    const res = createResponse();

    await handler(
      { query: { type: ["personal", "other"] } } as unknown as NextApiRequest,
      res as unknown as NextApiResponse,
    );

    expect(mockedUser).toHaveBeenCalledWith("personal");
  });

  it("type이 없으면 빈 문자열로 조회한다", async () => {
    mockedUser.mockResolvedValue({ status: 200, data: null } as never);
    const res = createResponse();

    await handler(
      { query: {} } as unknown as NextApiRequest,
      res as unknown as NextApiResponse,
    );

    expect(mockedUser).toHaveBeenCalledWith("");
    expect(res.statusCode).toBe(200);
    expect(res.body).toBeNull();
  });

  it("상위 상태가 400 이상이면 503과 null을 반환한다", async () => {
    mockedUser.mockResolvedValue({
      status: 404,
      data: { message: "no" },
    } as never);
    const res = createResponse();

    await handler(
      { query: { type: "personal" } } as unknown as NextApiRequest,
      res as unknown as NextApiResponse,
    );

    expect(res.statusCode).toBe(503);
    expect(res.body).toBeNull();
  });

  it("조회가 실패하면 503과 null을 반환한다", async () => {
    const error = new Error("github down");
    mockedUser.mockRejectedValue(error);
    const res = createResponse();

    await handler(
      { query: { type: "personal" } } as unknown as NextApiRequest,
      res as unknown as NextApiResponse,
    );

    expect(res.statusCode).toBe(503);
    expect(res.body).toBeNull();
    expect(console.warn).toHaveBeenCalledWith("GitHub API 호출 실패:", error);
  });
});
