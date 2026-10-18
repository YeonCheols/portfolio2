import axios from "axios";

import { postChatPrompt, sendMessage } from "@/features/cmdpallete/api/chatgpt";

jest.mock("axios");

const mockedPost = axios.post as jest.MockedFunction<typeof axios.post>;

describe("postChatPrompt", () => {
  it("성공하면 응답 데이터를 반환한다", async () => {
    mockedPost.mockResolvedValue({ status: 200, data: { choices: [] } });

    await expect(postChatPrompt("안녕")).resolves.toEqual({
      status: 200,
      data: { choices: [] },
    });
  });

  it("상태 코드가 400 이상이면 메시지를 반환한다", async () => {
    mockedPost.mockResolvedValue({
      status: 401,
      statusText: "Unauthorized",
      data: {},
    });

    await expect(postChatPrompt("안녕")).resolves.toEqual({
      status: 401,
      message: "Unauthorized",
    });
  });
});

describe("sendMessage", () => {
  it("응답의 reply를 반환한다", async () => {
    mockedPost.mockResolvedValue({ data: { reply: "답변" } });

    await expect(sendMessage("질문")).resolves.toBe("답변");
    expect(mockedPost).toHaveBeenCalledWith("/api/chat", { prompt: "질문" });
  });

  it("호출이 실패하면 빈 문자열을 반환한다", async () => {
    mockedPost.mockRejectedValue(new Error("network"));

    await expect(sendMessage("질문")).resolves.toBe("");
  });
});
