import type { NextApiRequest, NextApiResponse } from "next";

import handler from "@/pages/api/read-stats";
import { getALLTimeSinceToday, getReadStats } from "@/shared/api/wakatime";

jest.mock("@/shared/api/wakatime", () => ({
  getReadStats: jest.fn(),
  getALLTimeSinceToday: jest.fn(),
}));

const mockedStats = getReadStats as jest.MockedFunction<typeof getReadStats>;
const mockedAllTime = getALLTimeSinceToday as jest.MockedFunction<
  typeof getALLTimeSinceToday
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

describe("read-stats API", () => {
  beforeEach(() => {
    mockedStats.mockReset();
    mockedAllTime.mockReset();
  });

  it("통계 조회에 성공하면 누적 시간을 합쳐 반환한다", async () => {
    mockedStats.mockResolvedValue({
      status: 200,
      data: { human_readable_total: "1 hr" },
    });
    mockedAllTime.mockResolvedValue({
      status: 200,
      data: { text: "10 hrs" },
    });
    const res = createResponse();

    await handler({} as NextApiRequest, res as unknown as NextApiResponse);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      human_readable_total: "1 hr",
      all_time_since_today: { text: "10 hrs" },
    });
    expect(res.headers["Cache-Control"]).toBe(
      "public, s-maxage=60, stale-while-revalidate=30",
    );
  });

  it("누적 시간 조회가 실패하면 500을 반환한다", async () => {
    mockedStats.mockResolvedValue({
      status: 200,
      data: { human_readable_total: "1 hr" },
    });
    mockedAllTime.mockRejectedValue(new Error("waka down"));
    const res = createResponse();

    await handler({} as NextApiRequest, res as unknown as NextApiResponse);

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ message: "internal server error" });
    expect(res.headers["Cache-Control"]).toBeUndefined();
  });

  it("주간 통계 조회가 실패하면 예외를 던진다", async () => {
    mockedStats.mockRejectedValue(new Error("stats down"));
    const res = createResponse();

    await expect(
      handler({} as NextApiRequest, res as unknown as NextApiResponse),
    ).rejects.toThrow("stats down");
    expect(mockedAllTime).not.toHaveBeenCalled();
  });
});
