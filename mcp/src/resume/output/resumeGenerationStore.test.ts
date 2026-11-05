/** @jest-environment node */
import { createResumeGenerationStore } from "@mcp/resume/output/resumeGenerationStore";

const scope = { subject: "user-a", environment: "production" };
const request = { persona: "writer", prompt: "fake source" };

describe("resumeGenerationStore", () => {
  it("사용 모델은 허용 필드만 불변으로 보관하고 다른 사용자와 이전 생성은 접근하지 못한다", () => {
    const store = createResumeGenerationStore();
    const id = store.begin(scope);
    const model = {
      provider: "openai",
      modelName: "test-model",
      apiKey: "fake-secret",
    };
    store.captureModel(scope, id, model);
    model.modelName = "changed";
    const entry = store.read(scope, id);
    expect(entry.model).toEqual({
      provider: "openai",
      modelName: "test-model",
    });
    expect(JSON.stringify(entry)).not.toContain("fake-secret");
    if (entry.model) entry.model.modelName = "changed-again";
    expect(store.read(scope, id).model?.modelName).toBe("test-model");
    expect(() => store.captureModel(scope, id, model)).toThrow(
      "GENERATION_MODEL_EXISTS",
    );
    expect(() =>
      store.captureModel({ ...scope, subject: "other" }, id, model),
    ).toThrow("GENERATION_NOT_FOUND");
    const next = store.begin(scope);
    expect(store.read(scope, next)).not.toHaveProperty("model");
    expect(() => store.captureModel(scope, id, model)).toThrow(
      "GENERATION_NOT_FOUND",
    );
  });
  it("새 생성 접수 즉시 이전 원문을 초기화하고 늦은 응답과 다른 소유자의 접근을 거부한다", () => {
    const store = createResumeGenerationStore();
    const first = store.begin(scope);
    store.capture(scope, first, request, "first response");
    const second = store.begin(scope);
    expect(second).not.toBe(first);
    expect(store.read(scope, second)).toEqual({ id: second });
    expect(() => store.read(scope, first)).toThrow("GENERATION_NOT_FOUND");
    expect(() => store.capture(scope, first, request, "late response")).toThrow(
      "GENERATION_NOT_FOUND",
    );
    expect(() => store.read({ ...scope, subject: "other" }, second)).toThrow(
      "GENERATION_NOT_FOUND",
    );
    expect(() =>
      store.read({ ...scope, environment: "development" }, second),
    ).toThrow("GENERATION_NOT_FOUND");
    expect(() => createResumeGenerationStore().read(scope, second)).toThrow(
      "GENERATION_NOT_FOUND",
    );
  });
  it("보관한 소스와 원문은 조회나 파생 작업으로 수정할 수 없다", () => {
    const store = createResumeGenerationStore();
    const id = store.begin(scope);
    const snapshot = {
      selection: [],
      forms: [{ section: "profile", text: "original" }],
    };
    store.snapshot(scope, id, snapshot);
    store.capture(scope, id, request, "original response");
    snapshot.forms[0].text = "changed outside";
    const read = store.read(scope, id);
    if (!read.snapshot) throw new Error("snapshot missing");
    read.snapshot.forms[0].text = "changed copy";
    expect(store.read(scope, id).snapshot?.forms[0].text).toBe("original");
    expect(() =>
      store.snapshot(scope, id, { selection: [], forms: [] }),
    ).toThrow("GENERATION_SNAPSHOT_EXISTS");
    expect(() => store.capture(scope, id, request, "changed response")).toThrow(
      "GENERATION_RESPONSE_EXISTS",
    );
    expect(store.read(scope, id).response).toBe("original response");
  });
});
