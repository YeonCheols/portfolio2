/** @jest-environment node */
import {
  archiveBase,
  createFakeArchiveStorage,
  failedAttemptObjects,
  validResponse,
} from "@mcp/resume/testing/fakeArchiveStorage";
import { ArchiveNotFoundError } from "@mcp/resume/output/resumeDebugArchiveReader";
import { createResumeDebugArchiveWriter } from "@mcp/resume/output/resumeDebugArchiveWriter";
import { createResumeArchiveReproducer } from "@mcp/resume/output/reproduceResumeArchive";

const key = {
  environment: "development",
  subjectHash: "subj-a",
  generationId: "gen-1",
  attemptId: "att-1",
};
const original = { kind: "original" } as const;

describe("이력서 디버깅 아카이브 재현", () => {
  const realFetch = globalThis.fetch;
  const fetchSpy = jest.fn();
  beforeEach(() => {
    fetchSpy.mockReset();
    globalThis.fetch = fetchSpy as unknown as typeof fetch;
  });
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  const setup = (response: string, extra: Record<string, unknown> = {}) => {
    const storage = createFakeArchiveStorage({
      ...failedAttemptObjects(response),
      ...extra,
    });
    return {
      storage,
      writer: createResumeDebugArchiveWriter(storage),
      reproducer: createResumeArchiveReproducer(storage),
    };
  };
  const recordOf = (
    storage: ReturnType<typeof createFakeArchiveStorage>,
    id: string,
  ) => storage.objects.get(`${archiveBase}/reproductions/${id}.json`)?.body;

  it("보관된 원문이 깨져 있으면 검증 단계 실패를 기록으로 남기고 모델·원문 API는 부르지 않는다", async () => {
    const { storage, reproducer } = setup('{"claims": [끊긴');

    const result = await reproducer.reproduce(key, {
      source: original,
      action: "validate",
    });

    expect(result.record).toMatchObject({
      schemaVersion: 1,
      kind: "reproduction",
      action: "validate",
      source: original,
      status: "failed",
      failedStage: "validation",
      errorCode: "MODEL_REJECTED",
    });
    expect(recordOf(storage, result.record.reproductionId)).toEqual(
      result.record,
    );
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("저장된 수정본으로 검증과 PDF 생성을 다시 실행하고 PDF 본문은 기록에 넣지 않는다", async () => {
    const { storage, writer, reproducer } = setup('{"claims": [끊긴');
    const { revisionId } = await writer.saveRevision(key, {
      baseFile: "004-failed.json",
      response: validResponse,
    });
    const source = { kind: "revision", revisionId } as const;

    const validate = await reproducer.reproduce(key, {
      source,
      action: "validate",
    });
    expect(validate.record).toMatchObject({
      status: "completed",
      source,
      validation: { claims: 1, gaps: 0, conflicts: 0, uncertain: 0 },
    });
    expect(validate.pdf).toBeUndefined();

    const pdf = await reproducer.reproduce(key, { source, action: "pdf" });
    expect(pdf.record).toMatchObject({
      status: "completed",
      pdf: { byteLength: pdf.pdf.length },
    });
    expect(pdf.pdf.subarray(0, 4).toString()).toBe("%PDF");
    expect(
      JSON.stringify(recordOf(storage, pdf.record.reproductionId)),
    ).not.toContain("JVBER");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("근거 없는 문장이 섞이면 검증은 결과를 보여주고 PDF는 pdf 단계 실패로 기록한다", async () => {
    const mixed = JSON.parse(validResponse) as { claims: unknown[] };
    mixed.claims.push({ text: "근거 없음", sourceIds: ["missing"] });
    const { reproducer } = setup(JSON.stringify(mixed));

    const validate = await reproducer.reproduce(key, {
      source: original,
      action: "validate",
    });
    expect(validate.record.status).toBe("completed");
    expect(validate.record.validation.gaps).toBe(1);

    const pdf = await reproducer.reproduce(key, {
      source: original,
      action: "pdf",
    });
    expect(pdf.record).toMatchObject({
      status: "failed",
      failedStage: "pdf",
      errorCode: "UNVERIFIED_CLAIMS",
      validation: { claims: 1, gaps: 1 },
    });
    expect(pdf.pdf).toBeUndefined();
  });

  it("인정된 문장이 하나도 없으면 PDF는 본문이 비어 INCOMPLETE_RESUME으로 실패한다", async () => {
    const { reproducer } = setup(
      JSON.stringify({
        claims: [{ text: "근거 없음", sourceIds: ["missing"] }],
      }),
    );

    const pdf = await reproducer.reproduce(key, {
      source: original,
      action: "pdf",
    });

    expect(pdf.record).toMatchObject({
      status: "failed",
      failedStage: "pdf",
      errorCode: "INCOMPLETE_RESUME",
    });
  });

  it("스냅샷이나 응답이 없는 기록은 그 단계 실패로 남기고 없는 수정본은 기록 없이 거부한다", async () => {
    const { storage, reproducer } = setup(validResponse);
    for (const stage of ["004-failed", "003-model_response", "002-source"]) {
      storage.objects.delete(`${archiveBase}/${stage}.json`);
    }

    const result = await reproducer.reproduce(key, {
      source: original,
      action: "validate",
    });
    expect(result.record).toMatchObject({
      status: "failed",
      failedStage: "snapshot",
      errorCode: "SNAPSHOT_MISSING",
    });

    const before = storage.calls.putJson;
    await expect(
      reproducer.reproduce(key, {
        source: {
          kind: "revision",
          revisionId: "00000000-0000-4000-8000-000000000000",
        },
        action: "validate",
      }),
    ).rejects.toBeInstanceOf(ArchiveNotFoundError);
    expect(storage.calls.putJson).toBe(before);
  });

  it("같은 실행·원본·동작의 동시 요청은 하나만 실행하고 끝난 뒤에는 다시 실행할 수 있다", async () => {
    const { reproducer } = setup(validResponse);
    const input = { source: original, action: "validate" } as const;

    const [first, second] = await Promise.allSettled([
      reproducer.reproduce(key, input),
      reproducer.reproduce(key, input),
    ]);

    expect(first.status).toBe("fulfilled");
    expect(second).toMatchObject({
      status: "rejected",
      reason: { code: "REPRODUCTION_IN_PROGRESS" },
    });
    await expect(reproducer.reproduce(key, input)).resolves.toBeDefined();
    const list = await reproducer.listReproductions(key);
    expect(list).toHaveLength(2);
    expect(list[0]).toMatchObject({ action: "validate", status: "completed" });
  });
});
