/** @jest-environment node */
import {
  archiveBase,
  createFakeArchiveStorage,
  failedAttemptObjects,
  validResponse,
} from "@mcp/resume/testing/fakeArchiveStorage";
import {
  ArchiveNotFoundError,
  ArchiveQueryError,
} from "@mcp/resume/output/resumeDebugArchiveReader";
import { createResumeDebugArchiveWriter } from "@mcp/resume/output/resumeDebugArchiveWriter";

const key = {
  environment: "development",
  subjectHash: "subj-a",
  generationId: "gen-1",
  attemptId: "att-1",
};
const brokenResponse = '{"claims": [끊긴';
const request = { persona: "수정한 역할", prompt: "수정한 요청" };

const setup = () => {
  const storage = createFakeArchiveStorage(
    failedAttemptObjects(brokenResponse),
  );
  return { storage, writer: createResumeDebugArchiveWriter(storage) };
};
const snapshotOf = (storage: ReturnType<typeof createFakeArchiveStorage>) =>
  JSON.stringify(
    [...storage.objects].filter(([path]) => !path.includes("/revisions/")),
  );

describe("이력서 디버깅 수정본", () => {
  it("올바른 수정본을 원본과 다른 객체로 저장하고 원본 기록은 바꾸지 않는다", async () => {
    const { storage, writer } = setup();
    const before = snapshotOf(storage);

    const { revisionId } = await writer.saveRevision(key, {
      baseFile: "004-failed.json",
      request,
      response: validResponse,
    });

    const saved = storage.objects.get(
      `${archiveBase}/revisions/${revisionId}.json`,
    );
    expect(saved?.body).toMatchObject({
      schemaVersion: 1,
      kind: "revision",
      revisionId,
      environment: "development",
      subjectHash: "subj-a",
      generationId: "gen-1",
      attemptId: "att-1",
      base: { file: "004-failed.json" },
      request,
      response: validResponse,
    });
    expect(snapshotOf(storage)).toBe(before);
    expect(await writer.getRevision(key, revisionId)).toEqual(saved?.body);
  });

  it("잘못된 JSON·스키마·출처 참조·요청 형식·기준 파일은 저장하지 않고 코드로 거부한다", async () => {
    const { storage, writer } = setup();
    const cases: [string, Parameters<typeof writer.saveRevision>[1]][] = [
      ["INVALID_RESPONSE", { baseFile: "004-failed.json", response: "{" }],
      [
        "INVALID_RESPONSE",
        { baseFile: "004-failed.json", response: '{"claims":"x"}' },
      ],
      [
        "UNKNOWN_SOURCE_REF",
        {
          baseFile: "004-failed.json",
          response: JSON.stringify({
            claims: [{ text: "x", sourceIds: ["missing"] }],
          }),
        },
      ],
      [
        "INVALID_REQUEST_PAYLOAD",
        {
          baseFile: "004-failed.json",
          request: { prompt: 1 },
          response: validResponse,
        },
      ],
      [
        "INVALID_BASE_FILE",
        { baseFile: "../att-2/001-started.json", response: validResponse },
      ],
      [
        "RESPONSE_TOO_LARGE",
        { baseFile: "004-failed.json", response: "x".repeat(1_000_001) },
      ],
    ];
    for (const [code, input] of cases) {
      await expect(writer.saveRevision(key, input)).rejects.toMatchObject({
        code,
      });
    }
    expect(storage.calls.putJson).toBe(0);

    storage.objects.delete(`${archiveBase}/004-failed.json`);
    storage.objects.delete(`${archiveBase}/003-model_response.json`);
    storage.objects.delete(`${archiveBase}/002-source.json`);
    await expect(
      writer.saveRevision(key, {
        baseFile: "001-started.json",
        response: validResponse,
      }),
    ).rejects.toMatchObject({ code: "SNAPSHOT_MISSING" });
  });

  it("수정본 목록은 최신순이고 다른 실행·잘못된 ID는 조회하지 못한다", async () => {
    const { writer } = setup();
    const first = await writer.saveRevision(key, {
      baseFile: "004-failed.json",
      response: validResponse,
    });
    const second = await writer.saveRevision(key, {
      baseFile: "004-failed.json",
      response: validResponse,
    });

    const list = await writer.listRevisions(key);
    expect((list as { revisionId: string }[]).map((r) => r.revisionId)).toEqual(
      [second.revisionId, first.revisionId],
    );
    await expect(
      writer.getRevision({ ...key, attemptId: "att-other" }, first.revisionId),
    ).rejects.toBeInstanceOf(ArchiveNotFoundError);
    await expect(
      writer.getRevision(key, "../001-started"),
    ).rejects.toBeInstanceOf(ArchiveQueryError);
    await expect(
      writer.getRevision(key, "00000000-0000-4000-8000-000000000000"),
    ).rejects.toBeInstanceOf(ArchiveNotFoundError);
  });
});

describe("이력서 디버깅 아카이브 삭제", () => {
  const otherBase = "debug/resume/development/subj-a/gen-1/att-2";
  const setupDelete = () => {
    const storage = createFakeArchiveStorage({
      ...failedAttemptObjects(brokenResponse),
      [`${archiveBase}/revisions/rev-1.json`]: { kind: "revision" },
      [`${archiveBase}/reproductions/rep-1.json`]: { kind: "reproduction" },
      [`${otherBase}/001-started.json`]: { stage: "started" },
      "debug/resume/development/subj-a/gen-2/att-1/001-started.json": {
        stage: "started",
      },
    });
    return { storage, writer: createResumeDebugArchiveWriter(storage) };
  };

  it("확인 값이 대상 실행 ID와 다르면 아무것도 지우지 않는다", async () => {
    const { storage, writer } = setupDelete();

    await expect(writer.removeAttempt(key, "att-2")).rejects.toMatchObject({
      code: "CONFIRMATION_MISMATCH",
    });
    await expect(writer.removeAttempt(key, "")).rejects.toMatchObject({
      code: "CONFIRMATION_MISMATCH",
    });
    expect(storage.calls.removeObjects).toBe(0);
  });

  it("확인한 실행의 단계 파일·수정본·재현 기록만 지우고 다른 실행은 남긴다", async () => {
    const { storage, writer } = setupDelete();

    await expect(writer.removeAttempt(key, "att-1")).resolves.toEqual({
      removed: 6,
    });

    expect([...storage.objects.keys()].sort()).toEqual([
      "debug/resume/development/subj-a/gen-1/att-2/001-started.json",
      "debug/resume/development/subj-a/gen-2/att-1/001-started.json",
    ]);
  });

  it("없는 실행은 지우기를 시도하지 않고 일부만 지워지면 성공으로 보고하지 않는다", async () => {
    const { storage, writer } = setupDelete();

    await expect(
      writer.removeAttempt({ ...key, attemptId: "att-9" }, "att-9"),
    ).rejects.toBeInstanceOf(ArchiveNotFoundError);
    expect(storage.calls.removeObjects).toBe(0);

    storage.failures.removeBatch = true;
    await expect(writer.removeAttempt(key, "att-1")).rejects.toMatchObject({
      code: "DELETE_PARTIAL",
      removed: 5,
      remaining: 1,
    });
    expect(storage.objects.size).toBe(2 + 1);
  });

  it("예상보다 깊은 폴더가 있어 지우지 못한 객체가 남으면 성공으로 보고하지 않는다", async () => {
    const { storage, writer } = setupDelete();
    storage.objects.set(`${archiveBase}/revisions/a/b/c/deep.json`, {
      body: {},
      createdAt: "2026-11-04T00:10:00.000Z",
    });

    await expect(writer.removeAttempt(key, "att-1")).rejects.toMatchObject({
      code: "DELETE_PARTIAL",
      remaining: 1,
    });
    expect(
      storage.objects.has(`${archiveBase}/revisions/a/b/c/deep.json`),
    ).toBe(true);
  });
});
