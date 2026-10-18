import axios from "axios";
import type { NextApiRequest, NextApiResponse } from "next";

import handler from "@/pages/api/stacks";

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

describe("stacks API", () => {
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

  it("태그 조회에 성공하면 200과 데이터를 반환한다", async () => {
    mockedGet.mockResolvedValue({ data: [{ name: "React" }] });
    const res = createResponse();

    await handler({} as NextApiRequest, res as unknown as NextApiResponse);

    expect(mockedGet).toHaveBeenCalledWith("http://api.test/tag");
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ status: true, data: [{ name: "React" }] });
  });

  it("태그 조회가 실패하면 200과 실패 상태를 반환한다", async () => {
    const error = new Error("tag down");
    mockedGet.mockRejectedValue(error);
    const res = createResponse();

    await handler({} as NextApiRequest, res as unknown as NextApiResponse);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ status: false, error });
  });
});
