import axios from "axios";

import { getALLTimeSinceToday, getReadStats } from "@/shared/api/wakatime";

jest.mock("axios");

const mockedGet = axios.get as jest.MockedFunction<typeof axios.get>;

describe("getReadStats", () => {
  it("상태 코드가 400 이상이면 빈 배열을 반환한다", async () => {
    mockedGet.mockResolvedValue({ status: 401, data: {} });

    await expect(getReadStats()).resolves.toEqual({ status: 401, data: [] });
  });

  it("최근 7일 통계에서 상위 언어 3개만 남긴다", async () => {
    mockedGet.mockResolvedValue({
      status: 200,
      data: {
        data: {
          start: "2026-10-01",
          end: "2026-10-07",
          modified_at: "2026-10-07",
          categories: [],
          best_day: { date: "2026-10-06", text: "1 hr" },
          human_readable_daily_average_including_other_language: "1 hr",
          human_readable_total_including_other_language: "7 hrs",
          languages: [
            { name: "TypeScript" },
            { name: "CSS" },
            { name: "MDX" },
            { name: "JSON" },
          ],
          editors: [{ name: "Cursor" }],
        },
      },
    });

    const result = await getReadStats();

    expect(result.status).toBe(200);
    expect(result.data.languages).toEqual([
      { name: "TypeScript" },
      { name: "CSS" },
      { name: "MDX" },
    ]);
  });
});

describe("getALLTimeSinceToday", () => {
  it("상태 코드가 400 이상이면 빈 객체를 반환한다", async () => {
    mockedGet.mockResolvedValue({ status: 500, data: {} });

    await expect(getALLTimeSinceToday()).resolves.toEqual({
      status: 500,
      data: {},
    });
  });
});
