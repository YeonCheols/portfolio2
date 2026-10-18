import axios from "axios";
import type { NextApiRequest, NextApiResponse } from "next";

import handler from "@/pages/api/projects";

jest.mock("axios");

const mockedGet = axios.get as jest.MockedFunction<typeof axios.get>;

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

describe("projects API", () => {
  const originalApiUrl = process.env.API_URL;

  beforeEach(() => {
    process.env.API_URL = "http://api.test";
    mockedGet.mockReset();
  });

  afterEach(() => {
    if (originalApiUrl === undefined) {
      delete process.env.API_URL;
    } else {
      process.env.API_URL = originalApiUrl;
    }
  });

  it("프로젝트 검색에 성공하면 200과 데이터를 반환한다", async () => {
    mockedGet.mockResolvedValue({ data: { items: [{ id: 1 }] } });
    const res = createResponse();

    await handler(
      { query: { page: "2", size: "5" } } as unknown as NextApiRequest,
      res as unknown as NextApiResponse,
    );

    expect(mockedGet).toHaveBeenCalledWith("http://api.test/project/search", {
      params: { page: 2, size: 5 },
    });
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ status: true, data: { items: [{ id: 1 }] } });
  });

  it("쿼리가 없으면 page와 size를 NaN으로 요청한다", async () => {
    mockedGet.mockResolvedValue({ data: [] });
    const res = createResponse();

    await handler(
      { query: {} } as unknown as NextApiRequest,
      res as unknown as NextApiResponse,
    );

    expect(mockedGet).toHaveBeenCalledWith("http://api.test/project/search", {
      params: { page: Number.NaN, size: Number.NaN },
    });
  });

  it("검색이 실패하면 200과 실패 상태를 반환한다", async () => {
    const error = new Error("project down");
    mockedGet.mockRejectedValue(error);
    const res = createResponse();

    await handler(
      { query: { page: "1", size: "9" } } as unknown as NextApiRequest,
      res as unknown as NextApiResponse,
    );

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ status: false, error });
  });
});
