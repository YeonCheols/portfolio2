import { afterEach, describe, expect, it, vi } from "vitest";

import { listResumeQualityDashboard } from "./quality-api";

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
});
