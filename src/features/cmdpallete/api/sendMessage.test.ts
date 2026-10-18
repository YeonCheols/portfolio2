import axios from "axios";

import { sendMessage } from "@/features/cmdpallete/api/sendMessage";

jest.mock("axios");

const mockedPost = axios.post as jest.MockedFunction<typeof axios.post>;

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
