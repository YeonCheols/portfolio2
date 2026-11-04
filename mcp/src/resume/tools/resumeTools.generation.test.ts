/** @jest-environment node */
import { createResumePdf } from "@mcp/resume/output/createResumePdf";
import { createResumeGenerationStore } from "@mcp/resume/output/resumeGenerationStore";
import { connectedResume } from "@mcp/resume/testing/resumeFixture";
import { callResumeTool } from "@mcp/resume/tools/resumeTools";

jest.mock("@mcp/resume/output/createResumePdf", () => ({
  createResumePdf: jest.fn(async () => Buffer.from("%PDF-test")),
}));
const args = {
  source: "embedded",
  xml: 'schemaVersion="0.2.0"',
  template: "기본형",
  elementIds: ["profile-test"],
  sectionOrder: ["profile"],
};
const raw = JSON.stringify({
  claims: [
    {
      text: "테스트 사용자입니다",
      sourceIds: ["profile-test"],
      evidence: [{ sourceId: "profile-test", quote: "테스트 사용자" }],
    },
  ],
});
const context = () => ({
  store: createResumeGenerationStore(),
  scope: { subject: "user-a", environment: "production" },
});

describe("이력서 생성 원본 수명주기", () => {
  beforeEach(() => jest.clearAllMocks());
  it("PDF 실패 기록은 원문을 유지하고 예외 메시지 대신 안전한 코드만 보관한다", async () => {
    const storage = {
      putJson: jest.fn(async (_path: string, _record: unknown) => {}),
    };
    const generation = { ...context(), storage };
    const model = { generate: jest.fn(async () => raw) };
    const connection = { load: jest.fn(async () => connectedResume()) };
    const first = await callResumeTool(
      "generate_resume",
      args,
      connection,
      model,
      generation,
    );
    if (!first.ok) throw new Error(first.code);
    const { generationId } = JSON.parse(first.text);
    jest
      .mocked(createResumePdf)
      .mockRejectedValueOnce(new Error("private-provider-exception"));
    expect(
      await callResumeTool(
        "convert_resume_to_pdf",
        { generationId },
        connection,
        model,
        generation,
      ),
    ).toEqual({ ok: false, code: "PDF_GENERATION_FAILED", generationId });
    expect(storage.putJson).toHaveBeenLastCalledWith(
      expect.any(String),
      expect.objectContaining({
        stage: "failed",
        operation: "convert_resume_to_pdf",
        response: raw,
        errorCode: "PDF_GENERATION_FAILED",
      }),
    );
    expect(JSON.stringify(storage.putJson.mock.calls)).not.toContain(
      "private-provider-exception",
    );
    expect(model.generate).toHaveBeenCalledTimes(1);
    expect(connection.load).toHaveBeenCalledTimes(1);
  });
  it("새 요청 후 도착한 이전 모델 응답도 별도 기록으로 남기고 현재 생성은 복원하지 않는다", async () => {
    const storage = {
      putJson: jest.fn(async (_path: string, _record: unknown) => {}),
    };
    const generation = { ...context(), storage };
    let finish: (value: string) => void = () => {
      throw new Error("model not started");
    };
    let started: () => void = () => {};
    const ready = new Promise<void>((resolve) => {
      started = resolve;
    });
    const model = {
      generate: jest.fn(() => {
        started();
        return new Promise<string>((resolve) => {
          finish = resolve;
        });
      }),
    };
    const connection = { load: async () => connectedResume() };
    const first = callResumeTool(
      "generate_resume",
      args,
      connection,
      model,
      generation,
    );
    await ready;
    const second = await callResumeTool(
      "generate_resume",
      args,
      connection,
      { generate: async () => raw },
      generation,
    );
    if (!second.ok) throw new Error(second.code);
    const latest = JSON.parse(second.text).generationId;
    finish(raw);
    expect(await first).toMatchObject({
      ok: false,
      code: "GENERATION_NOT_FOUND",
    });
    expect(storage.putJson).toHaveBeenLastCalledWith(
      expect.any(String),
      expect.objectContaining({
        stage: "failed",
        response: raw,
        errorCode: "GENERATION_NOT_FOUND",
      }),
    );
    expect(generation.store.read(generation.scope, latest).response).toBe(raw);
  });
  it("응답 보관 중 Storage가 실패하면 오류를 표시하고 모델 응답은 메모리에 유지한다", async () => {
    const storage = {
      putJson: jest.fn(async (_path: string, record: unknown) => {
        if ((record as { stage: string }).stage === "model_response")
          throw new Error("storage unavailable");
      }),
    };
    const generation = { ...context(), storage };
    const model = { generate: jest.fn(async () => raw) };
    const result = await callResumeTool(
      "generate_resume",
      args,
      { load: async () => connectedResume() },
      model,
      generation,
    );
    expect(result).toMatchObject({ ok: false, code: "DEBUG_STORAGE_FAILED" });
    if (result.ok || !result.generationId)
      throw new Error("generation ID missing");
    expect(
      generation.store.read(generation.scope, result.generationId).response,
    ).toBe(raw);
    expect(model.generate).toHaveBeenCalledTimes(1);
  });
  it("파싱 실패 응답과 입력 스냅샷을 Storage에 보관하고 다음 요청이 이전 기록을 덮어쓰지 않는다", async () => {
    const storage = {
      putJson: jest.fn(async (_path: string, _record: unknown) => {}),
    };
    const generation = { ...context(), storage };
    const model = { generate: jest.fn(async () => "broken JSON {") };
    const connection = { load: jest.fn(async () => connectedResume()) };
    const first = await callResumeTool(
      "generate_resume",
      args,
      connection,
      model,
      generation,
    );
    expect(first.ok).toBe(false);
    const record = storage.putJson.mock.calls.find(
      ([, value]) => (value as { stage?: string }).stage === "failed",
    )?.[1];
    expect(record).toMatchObject({
      stage: "failed",
      response: "broken JSON {",
      snapshot: expect.objectContaining({ selection: expect.anything() }),
      errorCode: "MODEL_REJECTED",
    });
    expect(
      Array.isArray(
        (record as { snapshot: { selection: unknown } }).snapshot.selection,
      ),
    ).toBe(true);
    const firstPaths = storage.putJson.mock.calls.map(([path]) => path);
    await callResumeTool(
      "generate_resume",
      args,
      connection,
      model,
      generation,
    );
    const allPaths = storage.putJson.mock.calls.map(([path]) => path);
    expect(new Set(allPaths).size).toBe(allPaths.length);
    expect(firstPaths.every((path) => allPaths.includes(path))).toBe(true);
  });
  it("원문에 없는 수치가 있으면 재검증에서도 PDF를 만들지 않고 원본을 보존한다", async () => {
    const generation = context();
    const response = JSON.stringify({
      claims: [
        ...JSON.parse(raw).claims,
        {
          text: "테스트 사용자 50명입니다",
          sourceIds: ["profile-test"],
          formItem: "name",
          evidence: [{ sourceId: "profile-test", quote: "테스트 사용자" }],
        },
      ],
    });
    const model = { generate: jest.fn(async () => response) };
    const connection = { load: jest.fn(async () => connectedResume()) };
    const generated = await callResumeTool(
      "generate_resume",
      args,
      connection,
      model,
      generation,
    );
    if (!generated.ok) throw new Error(generated.code);
    const { generationId, validationIssues } = JSON.parse(generated.text);
    expect(validationIssues).toContainEqual({
      code: "UNSUPPORTED_NUMERIC_FACT",
      sourceIds: ["profile-test"],
    });
    expect(
      await callResumeTool(
        "convert_resume_to_pdf",
        { generationId },
        connection,
        model,
        generation,
      ),
    ).toEqual({ ok: false, code: "UNVERIFIED_CLAIMS", generationId });
    expect(createResumePdf).not.toHaveBeenCalled();
    expect(generation.store.read(generation.scope, generationId).response).toBe(
      response,
    );
    expect(model.generate).toHaveBeenCalledTimes(1);
    expect(connection.load).toHaveBeenCalledTimes(1);
  });
  it("최초 생성부터 재검증과 반복 PDF까지 같은 원본으로 모델을 총 한 번만 호출한다", async () => {
    const generation = context();
    const model = { generate: jest.fn(async () => raw) };
    const connection = { load: jest.fn(async () => connectedResume()) };
    const result = await callResumeTool(
      "generate_resume",
      args,
      connection,
      model,
      generation,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.code);
    const generated = JSON.parse(result.text);
    expect(generated.generationId).toEqual(expect.any(String));
    const generationId = generated.generationId;
    expect(generation.store.read(generation.scope, generationId).response).toBe(
      raw,
    );
    const resume = await callResumeTool(
      "generate_resume",
      { generationId },
      connection,
      model,
      generation,
    );
    expect(resume).toEqual(result);
    for (let attempt = 0; attempt < 2; attempt++) {
      const pdf = await callResumeTool(
        "convert_resume_to_pdf",
        { generationId },
        connection,
        model,
        generation,
      );
      expect(pdf.ok).toBe(true);
    }
    expect(model.generate).toHaveBeenCalledTimes(1);
    expect(connection.load).toHaveBeenCalledTimes(1);
    expect(createResumePdf).toHaveBeenCalledWith(
      expect.objectContaining({ resume: "프로필\n테스트 사용자입니다" }),
    );
  });
  it("파싱 실패 원문은 재실행해도 남고 모델을 재호출하지 않는다", async () => {
    const generation = context();
    const model = { generate: jest.fn(async () => "invalid model JSON") };
    const connection = { load: jest.fn(async () => connectedResume()) };
    const result = await callResumeTool(
      "generate_resume",
      args,
      connection,
      model,
      generation,
    );
    expect(result).toMatchObject({
      ok: false,
      code: "MODEL_REJECTED",
      generationId: expect.any(String),
    });
    if (result.ok || !result.generationId)
      throw new Error("generation ID missing");
    const generationId = result.generationId;
    expect(generation.store.read(generation.scope, generationId).response).toBe(
      "invalid model JSON",
    );
    expect(
      await callResumeTool(
        "generate_resume",
        { generationId },
        connection,
        model,
        generation,
      ),
    ).toEqual(result);
    expect(model.generate).toHaveBeenCalledTimes(1);
    expect(connection.load).toHaveBeenCalledTimes(1);
  });

  it("PDF 실패는 원본을 보존하고 같은 ID로만 다시 렌더링한다", async () => {
    const generation = context();
    const model = { generate: jest.fn(async () => raw) };
    const connection = { load: jest.fn(async () => connectedResume()) };
    const result = await callResumeTool(
      "generate_resume",
      args,
      connection,
      model,
      generation,
    );
    if (!result.ok) throw new Error(result.code);
    const { generationId } = JSON.parse(result.text);
    jest
      .mocked(createResumePdf)
      .mockRejectedValueOnce(new Error("renderer failed"));
    expect(
      await callResumeTool(
        "convert_resume_to_pdf",
        { generationId },
        connection,
        model,
        generation,
      ),
    ).toEqual({ ok: false, code: "PDF_GENERATION_FAILED", generationId });
    expect(generation.store.read(generation.scope, generationId).response).toBe(
      raw,
    );
    expect(
      (
        await callResumeTool(
          "convert_resume_to_pdf",
          { generationId },
          connection,
          model,
          generation,
        )
      ).ok,
    ).toBe(true);
    expect(model.generate).toHaveBeenCalledTimes(1);
    expect(connection.load).toHaveBeenCalledTimes(1);
  });

  it("새 생성이 응답 전에 실패해도 이전 원본과 ID는 접수 즉시 초기화된다", async () => {
    const generation = context();
    const model = { generate: jest.fn(async () => raw) };
    const connection = { load: jest.fn(async () => connectedResume()) };
    const first = await callResumeTool(
      "generate_resume",
      args,
      connection,
      model,
      generation,
    );
    if (!first.ok) throw new Error(first.code);
    const { generationId } = JSON.parse(first.text);
    let rejectNew: (error: Error) => void = () => {
      throw new Error("pending request missing");
    };
    const unavailable = new Promise<string>((_resolve, reject) => {
      rejectNew = reject;
    });
    model.generate.mockImplementationOnce(() => unavailable);
    const pending = callResumeTool(
      "generate_resume",
      args,
      connection,
      model,
      generation,
    );
    expect(() => generation.store.read(generation.scope, generationId)).toThrow(
      "GENERATION_NOT_FOUND",
    );
    rejectNew(new Error("upstream unavailable"));
    expect(await pending).toMatchObject({
      ok: false,
      code: "GENERATION_FAILED",
      generationId: expect.any(String),
    });
    const retry = await callResumeTool(
      "convert_resume_to_pdf",
      { generationId },
      connection,
      model,
      generation,
    );
    expect(retry).toMatchObject({ ok: false, code: "GENERATION_NOT_FOUND" });
    expect(model.generate).toHaveBeenCalledTimes(2);
  });

  it("새 생성 후 늦게 끝난 PDF는 이전 결과를 반환하거나 원본을 되살리지 않는다", async () => {
    const generation = context();
    const model = { generate: jest.fn(async () => raw) };
    const connection = { load: jest.fn(async () => connectedResume()) };
    const first = await callResumeTool(
      "generate_resume",
      args,
      connection,
      model,
      generation,
    );
    if (!first.ok) throw new Error(first.code);
    const { generationId } = JSON.parse(first.text);
    let finishPdf: (value: Buffer) => void = () => {
      throw new Error("PDF not started");
    };
    jest.mocked(createResumePdf).mockImplementationOnce(
      () =>
        new Promise<Buffer>((resolve) => {
          finishPdf = resolve;
        }),
    );
    const pendingPdf = callResumeTool(
      "convert_resume_to_pdf",
      { generationId },
      connection,
      model,
      generation,
    );
    const fresh = await callResumeTool(
      "generate_resume",
      args,
      connection,
      model,
      generation,
    );
    expect(fresh.ok).toBe(true);
    finishPdf(Buffer.from("old PDF"));
    expect(await pendingPdf).toEqual({
      ok: false,
      code: "GENERATION_NOT_FOUND",
      generationId,
    });
    expect(() => generation.store.read(generation.scope, generationId)).toThrow(
      "GENERATION_NOT_FOUND",
    );
  });

  it("다른 사용자·환경·인스턴스와 변조된 클라이언트 본문은 보관 원본을 대체하지 못한다", async () => {
    const generation = context();
    const model = { generate: jest.fn(async () => raw) };
    const connection = { load: jest.fn(async () => connectedResume()) };
    const result = await callResumeTool(
      "generate_resume",
      args,
      connection,
      model,
      generation,
    );
    if (!result.ok) throw new Error(result.code);
    const { generationId } = JSON.parse(result.text);
    for (const isolated of [
      { ...generation, scope: { ...generation.scope, subject: "other" } },
      {
        ...generation,
        scope: { ...generation.scope, environment: "development" },
      },
      context(),
    ]) {
      expect(
        await callResumeTool(
          "convert_resume_to_pdf",
          { generationId },
          connection,
          model,
          isolated,
        ),
      ).toEqual({ ok: false, code: "GENERATION_NOT_FOUND", generationId });
    }
    expect(
      await callResumeTool(
        "convert_resume_to_pdf",
        { generationId, generatedResume: "forged content" },
        connection,
        model,
        generation,
      ),
    ).toEqual({ ok: false, code: "INVALID_INPUT" });
    const canonical = await callResumeTool(
      "convert_resume_to_pdf",
      {
        generationId,
        claims: ["forged"],
        selection: ["fake"],
        resume: "forged PDF",
      },
      connection,
      model,
      generation,
    );
    expect(canonical).toEqual({ ok: false, code: "INVALID_INPUT" });
    expect(createResumePdf).not.toHaveBeenCalled();
    expect(model.generate).toHaveBeenCalledTimes(1);
    expect(generation.store.read(generation.scope, generationId).response).toBe(
      raw,
    );
  });
});
