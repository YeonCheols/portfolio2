import { afterEach, describe, expect, it, vi } from "vitest";

import {
  dashboardPageSize,
  listAllResumeQualityDashboard,
  listResumeQualityDashboard,
  maxDashboardPages,
} from "./quality-api";

const response = (body: unknown) =>
  ({ ok: true, status: 200, json: async () => body }) as Response;

describe("quality-api", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("환경과 페이지를 별도 품질 대시보드 API에 보내 평가 요약을 읽는다", async () => {
    const result = {
      items: [
        {
          evaluationId: "eval-1",
          metrics: [{ metricId: "pdf-layout", confirmedRate: 0.875 }],
        },
      ],
      hasMore: true,
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValue(response({ ok: true, ...result }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      listResumeQualityDashboard({
        environment: "production",
        page: 2,
        pageSize: 10,
      }),
    ).resolves.toEqual(result);
    expect(fetchMock).toHaveBeenCalledWith(
      "/admin/resume-quality/api/dashboard?environment=production&page=2&pageSize=10",
      expect.objectContaining({ credentials: "same-origin", method: "GET" }),
    );
  });

  it("마지막 페이지까지 이어서 읽어 모든 평가 기록을 한 목록으로 합친다", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        response({ ok: true, items: [{ evaluationId: "a" }], hasMore: true }),
      )
      .mockResolvedValueOnce(
        response({ ok: true, items: [{ evaluationId: "b" }], hasMore: false }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const result = await listAllResumeQualityDashboard({
      environment: "development",
    });

    expect(result.items.map((item) => item.evaluationId)).toEqual(["a", "b"]);
    expect(result.truncated).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      `/admin/resume-quality/api/dashboard?environment=development&page=1&pageSize=${dashboardPageSize}`,
      `/admin/resume-quality/api/dashboard?environment=development&page=2&pageSize=${dashboardPageSize}`,
    ]);
  });

  it("페이지 수 상한에 닿으면 읽은 만큼만 돌려주고 잘렸음을 알린다", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        response({ ok: true, items: [{ evaluationId: "x" }], hasMore: true }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const result = await listAllResumeQualityDashboard({
      environment: "production",
    });

    expect(fetchMock).toHaveBeenCalledTimes(maxDashboardPages);
    expect(result.items).toHaveLength(maxDashboardPages);
    expect(result.truncated).toBe(true);
  });

  it("중간 페이지가 실패하면 일부만 보여주지 않고 오류를 그대로 던진다", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        response({ ok: true, items: [{ evaluationId: "a" }], hasMore: true }),
      )
      .mockResolvedValueOnce({
        ok: false,
        status: 502,
        json: async () => ({ ok: false, code: "STORAGE_FAILED" }),
      } as Response);
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      listAllResumeQualityDashboard({ environment: "development" }),
    ).rejects.toThrow();
  });
});
