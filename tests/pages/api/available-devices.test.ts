import type { NextApiRequest, NextApiResponse } from "next";

import handler from "@/pages/api/available-devices";
import { getAvailableDevices } from "@/shared/api/spotify";

jest.mock("@/shared/api/spotify", () => ({
  getAvailableDevices: jest.fn(),
}));

const mockedDevices = getAvailableDevices as jest.MockedFunction<
  typeof getAvailableDevices
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

describe("available-devices API", () => {
  beforeEach(() => {
    mockedDevices.mockReset();
  });

  it("기기 조회에 성공하면 200과 데이터를 반환한다", async () => {
    mockedDevices.mockResolvedValue({
      data: { devices: [{ id: "phone" }] },
    } as never);
    const res = createResponse();

    await handler({} as NextApiRequest, res as unknown as NextApiResponse);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ devices: [{ id: "phone" }] });
    expect(res.headers["Cache-Control"]).toBe(
      "public, s-maxage=60, stale-while-revalidate=30",
    );
  });

  it("응답이 없으면 undefined를 반환한다", async () => {
    mockedDevices.mockResolvedValue(undefined as never);
    const res = createResponse();

    await handler({} as NextApiRequest, res as unknown as NextApiResponse);

    expect(res.statusCode).toBe(200);
    expect(res.body).toBeUndefined();
  });

  it("기기 조회가 실패하면 예외를 던진다", async () => {
    mockedDevices.mockRejectedValue(new Error("spotify down"));
    const res = createResponse();

    await expect(
      handler({} as NextApiRequest, res as unknown as NextApiResponse),
    ).rejects.toThrow("spotify down");
    expect(res.headers["Cache-Control"]).toBeUndefined();
  });
});
