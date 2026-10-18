import axios from "axios";
import type { NextApiRequest, NextApiResponse } from "next";

import handler from "@/pages/api/contact";

jest.mock("axios");

const mockedPost = axios.post as jest.MockedFunction<typeof axios.post>;

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

describe("contact API", () => {
  const originalApiUrl = process.env.API_URL;

  beforeEach(() => {
    process.env.API_URL = "http://api.test";
    mockedPost.mockReset();
    jest.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    if (originalApiUrl === undefined) {
      delete process.env.API_URL;
    } else {
      process.env.API_URL = originalApiUrl;
    }
    jest.restoreAllMocks();
  });

  it("메일 전송에 성공하면 200을 반환한다", async () => {
    mockedPost.mockResolvedValue({ data: {} });
    const formData = { email: "a@b.c", message: "안녕" };
    const res = createResponse();

    await handler(
      { body: { formData } } as NextApiRequest,
      res as unknown as NextApiResponse,
    );

    expect(mockedPost).toHaveBeenCalledWith(
      "http://api.test/mail/send",
      formData,
    );
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ status: 200 });
  });

  it("메일 전송이 실패하면 500을 반환한다", async () => {
    mockedPost.mockRejectedValue(new Error("smtp"));
    const res = createResponse();

    await handler(
      { body: { formData: { email: "a@b.c" } } } as NextApiRequest,
      res as unknown as NextApiResponse,
    );

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: "Something went wrong!" });
  });
});
