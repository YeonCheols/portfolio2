import axios from "axios";

import {
  createChatSession,
  createSpecializedPrompt,
  deleteChatSession,
  detectQuestionType,
  getChatSession,
  postGeminiChat,
  sendTechnicalMessage,
} from "@/features/chat/api/gemini";

jest.mock("axios");

const mockedPost = axios.post as jest.MockedFunction<typeof axios.post>;

describe("detectQuestionType", () => {
  it("코드 질문이면 code_review를 반환한다", () => {
    expect(detectQuestionType("이 코드 리뷰해줘")).toBe("code_review");
  });

  it("오류 질문이면 troubleshooting을 반환한다", () => {
    expect(detectQuestionType("이 에러가 왜 나나요")).toBe("troubleshooting");
  });

  it("해당 없으면 general을 반환한다", () => {
    expect(detectQuestionType("안녕")).toBe("general");
  });
});

describe("createSpecializedPrompt", () => {
  it("알 수 없는 유형이면 빈 문자열을 반환한다", () => {
    expect(createSpecializedPrompt("안녕", "general")).toBe("");
  });

  it("코드 리뷰 유형이면 안내 문구를 포함한다", () => {
    expect(createSpecializedPrompt("리뷰", "code_review")).toContain(
      "코드 리뷰",
    );
  });
});

describe("chat session", () => {
  it("세션을 만들고 조회하고 삭제한다", () => {
    const sessionId = createChatSession({ level: "beginner" });

    expect(getChatSession(sessionId)?.context).toEqual({ level: "beginner" });
    expect(deleteChatSession(sessionId)).toBe(true);
    expect(getChatSession(sessionId)).toBeNull();
  });
});

describe("postGeminiChat", () => {
  it("없는 세션이면 예외를 던진다", async () => {
    await expect(postGeminiChat("missing-session", "안녕")).rejects.toThrow(
      "채팅 세션을 찾을 수 없습니다.",
    );
  });

  it("키가 있으면 Gemini 답변을 반환한다", async () => {
    const previousKey = process.env.GEMINI_API_KEY;
    process.env.GEMINI_API_KEY = "test-key";
    jest.resetModules();

    const axiosModule = await import("axios");
    const post = axiosModule.default.post as jest.Mock;
    post.mockResolvedValue({
      status: 200,
      headers: {},
      data: {
        candidates: [{ content: { parts: [{ text: "리액트 답변" }] } }],
        usageMetadata: {},
      },
    });

    const gemini = await import("@/features/chat/api/gemini");
    const sessionId = gemini.createChatSession();
    const result = await gemini.postGeminiChat(sessionId, "리액트란?");

    expect(result.status).toBe(200);
    expect(result.data?.reply).toBe("리액트 답변");

    gemini.deleteChatSession(sessionId);
    process.env.GEMINI_API_KEY = previousKey;
  });
});

describe("sendTechnicalMessage", () => {
  it("호출이 실패하면 안내 문구를 반환한다", async () => {
    mockedPost.mockRejectedValue(new Error("network"));
    jest.spyOn(console, "error").mockImplementation(() => undefined);

    const result = await sendTechnicalMessage("리액트란?");

    expect(result.sessionId).toBeNull();
    expect(result.reply).toContain("일시적인 오류");
  });
});
