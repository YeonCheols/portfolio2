import { afterEach, describe, expect, it, vi } from "vitest";

import { listAllResumeQualityDashboard } from "./quality-api";

const response = (body: unknown, status = 200) =>
  ({ ok: status < 400, status, json: async () => body }) as Response;

describe("quality-api", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("선택한 환경의 합산 API를 한 번만 호출해 모든 평가 기록을 읽는다", async () => {
    const result = {
      items: [
        {
          evaluationId: "eval-1",
          metrics: [{ metricId: "pdf-layout", confirmedRate: 0.875 }],
        },
      ],
      truncated: false,
      archivesScanned: 1,
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValue(response({ ok: true, ...result }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      listAllResumeQualityDashboard({ environment: "production" }),
    ).resolves.toEqual(result);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "/admin/resume-quality/api/dashboard/all?environment=production",
      expect.objectContaining({ credentials: "same-origin", method: "GET" }),
    );
  });

  it("서버가 잘렸다고 알리면 그대로 전달한다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        response({
          ok: true,
          items: [],
          truncated: true,
          archivesScanned: 300,
        }),
      ),
    );

    const result = await listAllResumeQualityDashboard({
      environment: "development",
    });

    expect(result.truncated).toBe(true);
    expect(result.archivesScanned).toBe(300);
  });

  it("응답 형식이 맞지 않으면 일부만 쓰지 않고 오류를 던진다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(response({ ok: true, items: [] })),
    );

    await expect(
      listAllResumeQualityDashboard({ environment: "development" }),
    ).rejects.toThrow("품질 대시보드 응답 형식이 올바르지 않습니다.");
  });

  it("서버 오류는 그대로 오류로 던진다", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          response({ ok: false, code: "STORAGE_FAILED" }, 502),
        ),
    );

    await expect(
      listAllResumeQualityDashboard({ environment: "development" }),
    ).rejects.toThrow();
  });
});
