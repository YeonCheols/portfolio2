import axios from "axios";
import type { NextApiRequest, NextApiResponse } from "next";

import handler from "@/pages/api/profile";

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

describe("profile API", () => {
  it("프로필 조회에 성공하면 200과 데이터를 반환한다", async () => {
    mockedGet.mockResolvedValue({ data: { name: "성연철" } });
    const res = createResponse();

    await handler({} as NextApiRequest, res as unknown as NextApiResponse);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ status: 200, data: { name: "성연철" } });
  });

  it("프로필 조회가 실패하면 500을 반환한다", async () => {
    const error = new Error("down");
    mockedGet.mockRejectedValue(error);
    const res = createResponse();

    await handler({} as NextApiRequest, res as unknown as NextApiResponse);

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ status: 500, error });
  });
});
