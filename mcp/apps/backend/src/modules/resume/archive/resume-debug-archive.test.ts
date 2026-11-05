/** @jest-environment node */
import { createResumeDebugAttempt } from "@mcp/modules/resume/archive/resume-debug-archive";

describe("resumeDebugArchive", () => {
  it("사용 모델과 상세 검증 결과를 이후 실패 기록까지 누적 보관한다", async () => {
    const putJson = jest.fn(async (_path: string, _record: unknown) => {});
    const attempt = createResumeDebugAttempt(
      { putJson },
      { subject: "test", environment: "production" },
      "gen-1",
      "generate_resume",
    );
    const model = { provider: "openai", modelName: "test-model" };
    await attempt.write("model_request", { model });
    const validation = {
      status: "blocked" as const,
      gaps: [],
      conflicts: [],
      uncertain: [],
      validationIssues: [],
      diagnostics: [
        {
          claimIndex: 0,
          code: "UNSUPPORTED_NUMERIC_FACT" as const,
          text: "50명",
          sourceIds: ["test"],
          numeric: {
            expected: ["6명"],
            actual: ["50명"],
            unsupported: ["50명"],
          },
        },
      ],
    };
    await attempt.write("validation", { validation });
    model.modelName = "changed";
    await attempt.write("failed", { errorCode: "UNVERIFIED_CLAIMS" });
    expect(putJson.mock.calls[2][1]).toMatchObject({
      model: { provider: "openai", modelName: "test-model" },
      validation,
      failedAfter: "validation",
    });
  });
  it("실행별 경로와 사용자 해시를 사용해 파싱 전 원문과 스냅샷을 불변 이벤트로 보관한다", async () => {
    const putJson = jest.fn(async (_path: string, _record: unknown) => {});
    const attempt = createResumeDebugAttempt(
      { putJson },
      { subject: "user@example.test", environment: "development" },
      "generation-1",
      "generate_resume",
    );
    await attempt.write("source", { snapshot: { selection: [], forms: [] } });
    await attempt.write("model_response", { response: "broken JSON {" });
    const [[first], [second, record]] = putJson.mock.calls;
    expect(first).toMatch(
      /^debug\/resume\/development\/[a-f0-9]{64}\/generation-1\/[a-f0-9-]+\/001-source.json$/,
    );
    expect(second).toContain("002-model_response.json");
    expect(second).not.toContain("user@example.test");
    expect(record).toMatchObject({
      schemaVersion: 1,
      generationId: "generation-1",
      stage: "model_response",
      response: "broken JSON {",
      snapshot: { selection: [], forms: [] },
    });
    expect(putJson.mock.calls[0][1]).not.toHaveProperty("response");
    await attempt.write("failed", { errorCode: "MODEL_REJECTED" });
    expect(putJson.mock.calls[2][1]).toMatchObject({
      failedAfter: "model_response",
      errorCode: "MODEL_REJECTED",
    });
  });
});
