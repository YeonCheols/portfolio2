/** @jest-environment node */
import {
  archiveListConcurrency,
  createResumeDebugArchiveReader,
} from "@mcp/modules/resume/archive/resume-debug-archive-reader";

// 경로와 생성 시각 집합에서 Supabase 목록 응답과 같은 폴더·파일 구조를 만든다
const fakeStorage = (files: Record<string, string>) => {
  const listObjects = jest.fn(
    async (prefix: string, page: { limit: number; offset: number }) => {
      const entries = new Map<
        string,
        { kind: "file" | "folder"; createdAt?: string }
      >();
      for (const [path, createdAt] of Object.entries(files)) {
        if (!path.startsWith(`${prefix}/`)) continue;
        const [head, ...rest] = path.slice(prefix.length + 1).split("/");
        entries.set(
          head,
          rest.length ? { kind: "folder" } : { kind: "file", createdAt },
        );
      }
      return [...entries]
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(page.offset, page.offset + page.limit)
        .map(([name, entry]) => ({ name, ...entry }));
    },
  );
  return { listObjects };
};

const base = "debug/resume/development";

describe("이력서 디버깅 아카이브 목록", () => {
  it("환경 아래 모든 실행을 단계 요약과 함께 반환하고 실패 직전 단계를 표시한다", async () => {
    const storage = fakeStorage({
      [`${base}/subj-a/gen-1/att-1/001-started.json`]:
        "2026-11-04T01:00:00.000Z",
      [`${base}/subj-a/gen-1/att-1/002-model_response.json`]:
        "2026-11-04T01:00:05.000Z",
      [`${base}/subj-a/gen-1/att-1/003-failed.json`]:
        "2026-11-04T01:00:06.000Z",
      [`${base}/subj-b/gen-2/att-2/001-started.json`]:
        "2026-11-04T02:00:00.000Z",
      [`${base}/subj-b/gen-2/att-2/002-completed.json`]:
        "2026-11-04T02:00:09.000Z",
    });
    const reader = createResumeDebugArchiveReader(storage);

    const result = await reader.list({ environment: "development" });

    expect(result.items).toEqual([
      {
        subjectHash: "subj-b",
        generationId: "gen-2",
        attemptId: "att-2",
        startedAt: "2026-11-04T02:00:00.000Z",
        stages: ["started", "completed"],
        status: "completed",
      },
      {
        subjectHash: "subj-a",
        generationId: "gen-1",
        attemptId: "att-1",
        startedAt: "2026-11-04T01:00:00.000Z",
        stages: ["started", "model_response", "failed"],
        status: "failed",
        failedAfter: "model_response",
      },
    ]);
    expect(result.hasMore).toBe(false);
  });

  it("생성 ID·실행 ID·실패 단계로 좁히고 일치하지 않는 생성 폴더는 열지 않는다", async () => {
    const storage = fakeStorage({
      [`${base}/s/gen-a/att-1/001-started.json`]: "2026-11-01T00:00:00.000Z",
      [`${base}/s/gen-a/att-1/002-model_response.json`]:
        "2026-11-01T00:00:01.000Z",
      [`${base}/s/gen-a/att-1/003-failed.json`]: "2026-11-01T00:00:02.000Z",
      [`${base}/s/gen-a/att-2/001-started.json`]: "2026-11-02T00:00:00.000Z",
      [`${base}/s/gen-a/att-2/002-validation.json`]: "2026-11-02T00:00:01.000Z",
      [`${base}/s/gen-a/att-2/003-failed.json`]: "2026-11-02T00:00:02.000Z",
      [`${base}/s/gen-b/att-3/001-started.json`]: "2026-11-03T00:00:00.000Z",
    });
    const reader = createResumeDebugArchiveReader(storage);

    const byGeneration = await reader.list({
      environment: "development",
      generationId: "gen-a",
    });
    expect(byGeneration.items.map((item) => item.attemptId)).toEqual([
      "att-2",
      "att-1",
    ]);
    expect(
      storage.listObjects.mock.calls.some(([prefix]) =>
        prefix.includes("gen-b"),
      ),
    ).toBe(false);

    const byAttempt = await reader.list({
      environment: "development",
      attemptId: "att-1",
    });
    expect(byAttempt.items.map((item) => item.attemptId)).toEqual(["att-1"]);

    const byStage = await reader.list({
      environment: "development",
      failedStage: "validation",
    });
    expect(byStage.items.map((item) => item.attemptId)).toEqual(["att-2"]);
  });

  it("최신순 목록을 페이지 단위로 자르고 다음 페이지가 있으면 hasMore로 알린다", async () => {
    const storage = fakeStorage({
      [`${base}/s/g/att-1/001-started.json`]: "2026-11-01T00:00:00.000Z",
      [`${base}/s/g/att-2/001-started.json`]: "2026-11-02T00:00:00.000Z",
      [`${base}/s/g/att-3/001-started.json`]: "2026-11-03T00:00:00.000Z",
    });
    const reader = createResumeDebugArchiveReader(storage);

    const first = await reader.list({
      environment: "development",
      page: 1,
      pageSize: 2,
    });
    const second = await reader.list({
      environment: "development",
      page: 2,
      pageSize: 2,
    });
    const beyond = await reader.list({
      environment: "development",
      page: 3,
      pageSize: 2,
    });

    expect(first.items.map((item) => item.attemptId)).toEqual([
      "att-3",
      "att-2",
    ]);
    expect(first.hasMore).toBe(true);
    expect(second.items.map((item) => item.attemptId)).toEqual(["att-1"]);
    expect(second.hasMore).toBe(false);
    expect(beyond.items).toEqual([]);
    expect(beyond.hasMore).toBe(false);
  });

  it("모르는 환경과 경로가 될 수 있는 ID 및 범위를 벗어난 페이지는 저장소를 부르기 전에 거부한다", async () => {
    const storage = fakeStorage({
      [`${base}/s/g/a/001-started.json`]: "2026-11-01T00:00:00.000Z",
    });
    const reader = createResumeDebugArchiveReader(storage);
    const invalid = [
      { environment: "staging" },
      { environment: "../other" },
      { environment: "development", generationId: "gen/../x" },
      { environment: "development", attemptId: "a b" },
      { environment: "development", failedStage: "unknown_stage" },
      { environment: "development", page: 0 },
      { environment: "development", page: 1.5 },
      { environment: "development", pageSize: 0 },
      { environment: "development", pageSize: 101 },
    ];

    for (const query of invalid) {
      await expect(reader.list(query)).rejects.toThrow("INVALID_ARCHIVE_QUERY");
    }
    expect(storage.listObjects).not.toHaveBeenCalled();
    await expect(
      reader.list({ environment: "production", failedStage: "pdf" }),
    ).resolves.toEqual({ items: [], hasMore: false });
  });

  it("시작 시각이 늦은 실행이 먼저 오고 시각이 같으면 실행 ID 순으로 고정한다", async () => {
    const storage = fakeStorage({
      [`${base}/s/gen-a/att-old/001-started.json`]: "2026-11-01T00:00:00.000Z",
      [`${base}/s/gen-a/att-tie-2/001-started.json`]:
        "2026-11-03T00:00:00.000Z",
      [`${base}/s/gen-b/att-new/001-started.json`]: "2026-11-04T00:00:00.000Z",
      [`${base}/s/gen-b/att-tie-1/001-started.json`]:
        "2026-11-03T00:00:00.000Z",
    });
    const reader = createResumeDebugArchiveReader(storage);

    const { items } = await reader.list({ environment: "development" });

    expect(items.map((item) => item.attemptId)).toEqual([
      "att-new",
      "att-tie-1",
      "att-tie-2",
      "att-old",
    ]);
  });
});

describe("이력서 디버깅 아카이브 목록 병렬 순회", () => {
  it("폴더를 제한된 동시 수로 병렬 조회하고 결과 순서는 최신순 그대로다", async () => {
    // 3 사용자 × 2 생성 × 2 실행 = 12개. 시작 시각은 번호가 클수록 최신이다
    const files: Record<string, string> = {};
    let order = 0;
    for (const subject of ["s1", "s2", "s3"])
      for (const generation of ["g1", "g2"])
        for (const attempt of ["a1", "a2"]) {
          order += 1;
          const stamp = `2026-11-04T00:${String(order).padStart(2, "0")}:00.000Z`;
          files[
            `${base}/${subject}/${generation}/${attempt}/001-started.json`
          ] = stamp;
        }
    const storage = fakeStorage(files);
    let inFlight = 0;
    let peak = 0;
    const original = storage.listObjects.getMockImplementation()!;
    storage.listObjects.mockImplementation(async (prefix, page) => {
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      // 호출이 겹칠 수 있게 응답을 조금 늦춘다
      await new Promise((resolve) => setTimeout(resolve, 5));
      try {
        return await original(prefix, page);
      } finally {
        inFlight -= 1;
      }
    });
    const reader = createResumeDebugArchiveReader(storage);

    const { items } = await reader.list({
      environment: "development",
      pageSize: 100,
    });

    expect(peak).toBeGreaterThan(1);
    expect(peak).toBeLessThanOrEqual(archiveListConcurrency);
    expect(items).toHaveLength(12);
    expect(
      items.map(
        (item) => `${item.subjectHash}/${item.generationId}/${item.attemptId}`,
      ),
    ).toEqual([
      "s3/g2/a2",
      "s3/g2/a1",
      "s3/g1/a2",
      "s3/g1/a1",
      "s2/g2/a2",
      "s2/g2/a1",
      "s2/g1/a2",
      "s2/g1/a1",
      "s1/g2/a2",
      "s1/g2/a1",
      "s1/g1/a2",
      "s1/g1/a1",
    ]);
  });
});

const attemptPath = `${base}/subj-a/gen-1/att-1`;
const broken = '{"summary": "끊긴 JSON';

// 목록 구조에 저장 객체 본문과 서명 URL 발급을 더한 가짜 저장소
const fakeDetailStorage = () => {
  const files = {
    [`${attemptPath}/001-started.json`]: "2026-11-04T01:00:00.000Z",
    [`${attemptPath}/002-model_response.json`]: "2026-11-04T01:00:05.000Z",
    [`${attemptPath}/003-failed.json`]: "2026-11-04T01:00:06.000Z",
  };
  const bodies: Record<string, unknown> = {
    [`${attemptPath}/001-started.json`]: { stage: "started" },
    [`${attemptPath}/002-model_response.json`]: {
      stage: "model_response",
      response: broken,
    },
    [`${attemptPath}/003-failed.json`]: {
      stage: "failed",
      request: { persona: "작성자", prompt: "요청 본문" },
      response: broken,
      validation: {
        gaps: [],
        conflicts: [],
        uncertain: [],
        validationIssues: [],
      },
      errorCode: "INVALID_MODEL_JSON",
      failedAfter: "model_response",
    },
  };
  return {
    ...fakeStorage(files),
    getJson: jest.fn(async (path: string) => {
      if (!(path in bodies)) throw new Error("STORAGE_READ_FAILED");
      return structuredClone(bodies[path]);
    }),
    createSignedUrl: jest.fn(
      async (path: string) =>
        `https://storage.example.test/sign/${path}?token=fake`,
    ),
  };
};

const attemptKey = {
  environment: "development",
  subjectHash: "subj-a",
  generationId: "gen-1",
  attemptId: "att-1",
};

describe("이력서 디버깅 아카이브 상세", () => {
  it("단계 파일 목록과 마지막 기록의 요청·원문 응답·검증 결과를 저장된 그대로 반환한다", async () => {
    const reader = createResumeDebugArchiveReader(fakeDetailStorage());

    const detail = await reader.get(attemptKey);

    expect(detail.summary).toMatchObject({
      attemptId: "att-1",
      status: "failed",
      failedAfter: "model_response",
    });
    expect(detail.files).toEqual([
      {
        name: "001-started.json",
        stage: "started",
        createdAt: "2026-11-04T01:00:00.000Z",
      },
      {
        name: "002-model_response.json",
        stage: "model_response",
        createdAt: "2026-11-04T01:00:05.000Z",
      },
      {
        name: "003-failed.json",
        stage: "failed",
        createdAt: "2026-11-04T01:00:06.000Z",
      },
    ]);
    expect(detail.latest).toMatchObject({
      request: { persona: "작성자", prompt: "요청 본문" },
      errorCode: "INVALID_MODEL_JSON",
    });
    expect((detail.latest as { response: string }).response).toBe(broken);
  });
  it("없는 실행과 경로가 될 수 있는 키는 본문을 읽기 전에 거부한다", async () => {
    const storage = fakeDetailStorage();
    const reader = createResumeDebugArchiveReader(storage);

    await expect(
      reader.get({ ...attemptKey, attemptId: "att-missing" }),
    ).rejects.toThrow("ARCHIVE_NOT_FOUND");
    expect(storage.getJson).not.toHaveBeenCalled();

    storage.listObjects.mockClear();
    for (const key of [
      { ...attemptKey, environment: "staging" },
      { ...attemptKey, subjectHash: "../other" },
      { ...attemptKey, generationId: "gen/1" },
      { ...attemptKey, attemptId: "" },
    ]) {
      await expect(reader.get(key)).rejects.toThrow("INVALID_ARCHIVE_QUERY");
    }
    expect(storage.listObjects).not.toHaveBeenCalled();
  });

  it("실행 폴더에 있는 단계 파일만 짧은 서명 URL로 열고 그 밖의 파일은 서명하지 않는다", async () => {
    const storage = fakeDetailStorage();
    const reader = createResumeDebugArchiveReader(storage);

    await expect(
      reader.signedUrl(attemptKey, "002-model_response.json"),
    ).resolves.toBe(
      `https://storage.example.test/sign/${attemptPath}/002-model_response.json?token=fake`,
    );
    for (const name of [
      "../att-2/001-started.json",
      "999-started.json",
      "notes.txt",
    ]) {
      await expect(reader.signedUrl(attemptKey, name)).rejects.toThrow();
    }
    expect(storage.createSignedUrl).toHaveBeenCalledTimes(1);
  });
});
