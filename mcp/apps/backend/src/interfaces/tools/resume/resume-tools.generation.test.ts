/** @jest-environment node */
import { createResumePdf } from "@mcp/modules/resume/render/create-resume-pdf";
import { createResumeGenerationStore } from "@mcp/modules/resume/generation/resume-generation-store";
import {
  connectedResume,
  resumeNode,
} from "@mcp/modules/resume/testing/resume-fixture";
import { callResumeTool } from "@mcp/interfaces/tools/resume/resume-tools";

jest.mock("@mcp/modules/resume/render/create-resume-pdf", () => ({
  ...jest.requireActual("@mcp/modules/resume/render/create-resume-pdf"),
  createResumePdf: jest.fn(async () =>
    Buffer.from("%PDF-test\n/Type /Page\n%%EOF"),
  ),
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
  it("구조화된 인원 단위를 생성 스냅샷과 PDF 재검증에 보존하고 모델과 원문을 재조회하지 않는다", async () => {
    const source = connectedResume();
    const outcome = resumeNode("outcome", {
      attributes: { id: "people", visibility: "public" },
      children: [
        resumeNode("before", {
          attributes: { unit: "person", visibility: "public" },
          text: "700000",
        }),
      ],
    });
    const connection = {
      load: jest.fn(async () => ({
        ...source,
        sections: { ...source.sections, outcomes: [outcome] },
      })),
    };
    const model = {
      generate: jest.fn(async () =>
        JSON.stringify({
          claims: [
            ...JSON.parse(raw).claims,
            {
              text: "회원 70만명",
              sourceIds: ["people"],
              formItem: "outcome",
              evidence: [{ sourceId: "people", quote: "700000" }],
            },
          ],
        }),
      ),
    };
    const generation = context();
    const first = await callResumeTool(
      "generate_resume",
      {
        ...args,
        elementIds: ["profile-test", "people"],
        sectionOrder: ["profile", "outcomes"],
      },
      connection,
      model,
      generation,
    );
    if (!first.ok) throw new Error(first.code);
    const generated = JSON.parse(first.text);
    expect(generated.validationIssues).toEqual([]);
    expect(
      generation.store
        .read(generation.scope, generated.generationId)
        .snapshot?.selection.find((node) => node.id === "people")?.children[0]
        .unit,
    ).toBe("person");
    const pdf = await callResumeTool(
      "convert_resume_to_pdf",
      { generationId: generated.generationId },
      connection,
      undefined,
      generation,
    );
    expect(pdf).toEqual({
      ok: false,
      code: "RESUME_QUALITY_BLOCKED",
      generationId: generated.generationId,
    });
    expect(createResumePdf).toHaveBeenCalledTimes(1);
    expect(model.generate).toHaveBeenCalledTimes(1);
    expect(connection.load).toHaveBeenCalledTimes(1);
  });
  beforeEach(() => jest.clearAllMocks());
  it("실제 사용 모델과 숫자 진단을 생성·PDF 아카이브에 남기고 재변환 중 모델을 조회하지 않는다", async () => {
    const storage = {
      putJson: jest.fn(async (_path: string, _record: unknown) => {}),
    };
    const generation = { ...context(), storage };
    const model = {
      generate: jest.fn(
        async (
          _request: unknown,
          onModel?: (info: {
            provider: string;
            modelName: string;
          }) => void | Promise<void>,
        ) => {
          await onModel?.({
            provider: "openai",
            modelName: "test-model",
            ...{ apiKey: "fake-secret" },
          });
          return JSON.stringify({
            claims: [
              ...JSON.parse(raw).claims,
              {
                text: "사용자 50명",
                sourceIds: ["profile-test"],
                formItem: "name",
                evidence: [
                  { sourceId: "profile-test", quote: "테스트 사용자" },
                ],
              },
            ],
          });
        },
      ),
    };
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
    expect(storage.putJson).toHaveBeenLastCalledWith(
      expect.any(String),
      expect.objectContaining({
        model: { provider: "openai", modelName: "test-model" },
        validation: expect.objectContaining({
          status: "blocked",
          diagnostics: [
            expect.objectContaining({
              code: "UNSUPPORTED_NUMERIC_FACT",
              numeric: {
                expected: [],
                actual: ["50명"],
                unsupported: ["50명"],
              },
            }),
          ],
        }),
      }),
    );
    await callResumeTool(
      "convert_resume_to_pdf",
      { generationId },
      connection,
      model,
      generation,
    );
    expect(storage.putJson).toHaveBeenLastCalledWith(
      expect.any(String),
      expect.objectContaining({
        model: { provider: "openai", modelName: "test-model" },
        errorCode: "UNVERIFIED_CLAIMS",
      }),
    );
    expect(JSON.stringify(storage.putJson.mock.calls)).not.toContain(
      "fake-secret",
    );
    expect(model.generate).toHaveBeenCalledTimes(1);
    expect(connection.load).toHaveBeenCalledTimes(1);
  });
  it("검토 대기 품질 결과를 보존하면서 PDF 변환을 완료한다", async () => {
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
    const converted = await callResumeTool(
      "convert_resume_to_pdf",
      { generationId },
      connection,
      model,
      generation,
    );
    expect(converted).toMatchObject({
      ok: true,
      text: "이력서 PDF를 생성했습니다.",
    });
    expect(storage.putJson).toHaveBeenLastCalledWith(
      expect.any(String),
      expect.objectContaining({
        stage: "completed",
        operation: "convert_resume_to_pdf",
        response: raw,
        qualityEvaluation: expect.objectContaining({
          run: expect.objectContaining({
            domain: "resume",
            cases: expect.arrayContaining([
              expect.objectContaining({
                decision: "needs_review",
                blocking: false,
              }),
            ]),
          }),
          aggregates: expect.arrayContaining([
            expect.objectContaining({
              needsReviewCases: expect.any(Number),
              blockingCases: 0,
            }),
          ]),
        }),
      }),
    );
    expect(createResumePdf).toHaveBeenCalledTimes(1);
    expect(model.generate).toHaveBeenCalledTimes(1);
    expect(connection.load).toHaveBeenCalledTimes(1);
  });
  it("검토 기록이 없어도 대기 사례를 보존하고 PDF 변환을 허용한다", async () => {
    const storage = {
      putJson: jest.fn(async (_path: string, _record: unknown) => {}),
    };
    const qualityReviews = {
      load: jest.fn(
        async ({
          evaluation,
        }: {
          evaluation: {
            evaluationId: string;
            caseSetVersion: string;
            policyVersion: string;
            inputRef: string;
            outputRef: string;
            cases: { caseId: string; decision: string; blocking: boolean }[];
          };
        }) =>
          evaluation.cases
            .filter(({ decision }) => decision === "needs_review")
            .map(({ caseId }) => ({
              evaluationId: evaluation.evaluationId,
              caseSetVersion: evaluation.caseSetVersion,
              policyVersion: evaluation.policyVersion,
              inputRef: evaluation.inputRef,
              outputRef: evaluation.outputRef,
              caseId,
              decision: "pass" as const,
              reviewedAt: "2026-11-06T01:00:00.000Z",
              reviewerHash: "a".repeat(64),
            })),
      ),
    };
    const generation = { ...context(), storage, qualityReviews };
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

    const converted = await callResumeTool(
      "convert_resume_to_pdf",
      { generationId },
      connection,
      model,
      generation,
    );

    expect(converted.ok).toBe(true);
    expect(qualityReviews.load).toHaveBeenCalledWith(
      expect.objectContaining({ generationId }),
    );
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
  it("재검증에서 품질 미검토 claim을 남기면서 PDF 완료를 허용하고 모델을 재호출하지 않는다", async () => {
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
      expect(pdf).toMatchObject({
        ok: true,
        text: "이력서 PDF를 생성했습니다.",
      });
    }
    expect(model.generate).toHaveBeenCalledTimes(1);
    expect(connection.load).toHaveBeenCalledTimes(1);
    expect(createResumePdf).toHaveBeenCalledTimes(2);
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

  it("검토 대기 상태에서도 원본을 보존하고 같은 ID로 PDF를 다시 만든다", async () => {
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
    expect(
      await callResumeTool(
        "convert_resume_to_pdf",
        { generationId },
        connection,
        model,
        generation,
      ),
    ).toMatchObject({ ok: true, text: "이력서 PDF를 생성했습니다." });
    expect(generation.store.read(generation.scope, generationId).response).toBe(
      raw,
    );
    expect(
      await callResumeTool(
        "convert_resume_to_pdf",
        { generationId },
        connection,
        model,
        generation,
      ),
    ).toMatchObject({ ok: true, text: "이력서 PDF를 생성했습니다." });
    expect(createResumePdf).toHaveBeenCalledTimes(2);
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

  it("사람이 실패로 판정한 품질 사례가 있으면 PDF를 반환하지 않는다", async () => {
    const generation = context();
    const qualityReviews = {
      load: jest.fn(
        async ({
          evaluation,
        }: {
          evaluation: {
            evaluationId: string;
            caseSetVersion: string;
            policyVersion: string;
            inputRef: string;
            outputRef: string;
            cases: { metricId: string; caseId: string; decision: string }[];
          };
        }) =>
          evaluation.cases
            .filter(
              ({ metricId, decision }) =>
                metricId === "pdf-layout" && decision === "needs_review",
            )
            .map(({ caseId }) => ({
              evaluationId: evaluation.evaluationId,
              caseSetVersion: evaluation.caseSetVersion,
              policyVersion: evaluation.policyVersion,
              inputRef: evaluation.inputRef,
              outputRef: evaluation.outputRef,
              caseId,
              decision: "fail" as const,
              reviewedAt: "2026-11-06T01:00:00.000Z",
              reviewerHash: "a".repeat(64),
            })),
      ),
    };
    Object.assign(generation, { qualityReviews });
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
    const pdf = await callResumeTool(
      "convert_resume_to_pdf",
      { generationId },
      connection,
      model,
      generation,
    );
    expect(pdf).toEqual({
      ok: false,
      code: "RESUME_QUALITY_BLOCKED",
      generationId,
    });
    expect(qualityReviews.load).toHaveBeenCalledTimes(1);
    expect(createResumePdf).toHaveBeenCalledTimes(1);
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
