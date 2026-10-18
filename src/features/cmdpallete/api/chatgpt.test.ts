import axios from "axios";

import { postChatPrompt } from "@/features/cmdpallete/api/chatgpt";

jest.mock("axios");

const mockedPost = axios.post as jest.MockedFunction<typeof axios.post>;

describe("postChatPrompt", () => {
  it("OPENAI_API_KEY로 Authorization 헤더를 만든다", async () => {
    jest.resetModules();
    process.env.OPENAI_API_KEY = "openai-key";

    const axiosModule = await import("axios");
    const { postChatPrompt } = await import(
      "@/features/cmdpallete/api/chatgpt"
    );
    const post = axiosModule.default.post as jest.Mock;
    post.mockResolvedValue({ status: 200, data: { choices: [] } });

    await postChatPrompt("안녕");

    expect(post).toHaveBeenCalledWith(
      "https://api.openai.com/v1/completions",
      expect.objectContaining({ prompt: "안녕. answer briefly" }),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer openai-key",
        }),
      }),
    );
  });

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
