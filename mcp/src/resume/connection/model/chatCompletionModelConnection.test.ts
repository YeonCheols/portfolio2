import { fetchGeminiModelResult } from "@mcp/resume/connection/model/providers/geminiModelConnection";
import { fetchOpenAiModelResult } from "@mcp/resume/connection/model/providers/openAiModelConnection";

const adapters = [fetchOpenAiModelResult, fetchGeminiModelResult];
const input = { persona: "test", prompt: "ok" };
const options = {
  url: "https://model.example/chat/completions",
  token: "fake-key",
  model: "test-model",
};

describe("공급자 공통 Chat Completions 경계", () => {
  it("성공 응답이 null이면 공급자 오류 원문 대신 요청 거부 코드로 처리한다", async () => {
    for (const adapter of adapters) {
      await expect(
        adapter(input, {
          ...options,
          fetchImpl: async () => ({ ok: true, json: async () => null }),
        }),
      ).rejects.toMatchObject({ code: "MODEL_REJECTED" });
    }
  });
});
