import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getArchiveDetail,
  getArchiveFileUrl,
  listArchives,
} from "./archive-api";

const jsonResponse = (body: unknown, status = 200) =>
  ({ ok: status < 400, status, json: async () => body }) as Response;

const summary = {
  subjectHash: "subj-a",
  generationId: "gen-1",
  attemptId: "att-1",
  startedAt: "2026-11-04T01:00:00.000Z",
  stages: ["started", "failed"],
  status: "failed",
};
const key = {
  environment: "development",
  subjectHash: "subj-a",
  generationId: "gen-1",
  attemptId: "att-1",
} as const;

describe("archive-api", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("목록은 비어 있지 않은 조건만 쿼리로 보내고 같은 출처 쿠키로 요청한다", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        jsonResponse({ ok: true, items: [summary], hasMore: true }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const result = await listArchives({
      environment: "development",
      generationId: "gen-1",
      attemptId: "",
      failedStage: undefined,
      page: 2,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/admin/debug/resume/api/archives?environment=development&generationId=gen-1&page=2",
      expect.objectContaining({ credentials: "same-origin", method: "GET" }),
    );
    expect(result).toEqual({ items: [summary], hasMore: true });
  });

  it("상세와 서명 URL은 실행 키를 쿼리로 보내고 형식이 틀린 응답은 거부한다", async () => {
    const detail = {
      ok: true,
      summary,
      files: [{ name: "001-started.json", stage: "started" }],
      latest: { response: "{끊긴 JSON" },
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(detail))
      .mockResolvedValueOnce(
        jsonResponse({
          ok: true,
          url: "https://storage.example.test/sign?t=1",
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({ ok: true, url: "javascript:alert(1)" }),
      )
      .mockResolvedValueOnce(jsonResponse({ ok: true, items: "bad" }));
    vi.stubGlobal("fetch", fetchMock);
    const keyQuery =
      "environment=development&subjectHash=subj-a&generationId=gen-1&attemptId=att-1";

    await expect(getArchiveDetail(key)).resolves.toEqual({
      summary,
      files: detail.files,
      latest: detail.latest,
    });
    expect(fetchMock.mock.calls[0][0]).toBe(
      `/admin/debug/resume/api/archives/detail?${keyQuery}`,
    );
    await expect(getArchiveFileUrl(key, "001-started.json")).resolves.toBe(
      "https://storage.example.test/sign?t=1",
    );
    expect(fetchMock.mock.calls[1][0]).toBe(
      `/admin/debug/resume/api/archives/file-url?${keyQuery}&file=001-started.json`,
    );
    await expect(getArchiveFileUrl(key, "001-started.json")).rejects.toThrow(
      "형식이 올바르지 않습니다",
    );
    await expect(listArchives({ environment: "development" })).rejects.toThrow(
      "형식이 올바르지 않습니다",
    );
  });

  it("세션 만료는 로그인으로 보내고 없는 실행과 그 밖의 실패는 서버 내용 없이 안내한다", async () => {
    const assign = vi.fn();
    vi.stubGlobal("location", { origin: "http://localhost:8080", assign });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({}, 401))
      .mockResolvedValueOnce(jsonResponse({ code: "ARCHIVE_NOT_FOUND" }, 404))
      .mockResolvedValueOnce(jsonResponse({ code: "STORAGE_FAILED" }, 502));
    vi.stubGlobal("fetch", fetchMock);

    await expect(getArchiveDetail(key)).rejects.toThrow(
      "세션이 만료되었습니다. 다시 로그인해 주세요.",
    );
    expect(assign).toHaveBeenCalledWith(
      "http://localhost:8080/admin/ai-models/connect",
    );
    await expect(getArchiveDetail(key)).rejects.toThrow(
      "보관된 실행을 찾을 수 없습니다.",
    );
    await expect(getArchiveDetail(key)).rejects.toThrow(
      "요청을 처리하지 못했습니다. 다시 시도해 주세요.",
    );
  });
});
