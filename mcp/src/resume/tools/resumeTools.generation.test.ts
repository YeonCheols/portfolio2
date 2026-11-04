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
