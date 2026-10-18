import axios from "axios";

import { sendMessage } from "@/features/contact/api/contact";

jest.mock("axios");

const mockedPost = axios.post as jest.MockedFunction<typeof axios.post>;

describe("sendMessage", () => {
  beforeEach(() => {
    mockedPost.mockReset();
  });

  it("성공하면 상태와 응답 데이터를 반환한다", async () => {
    const formData = new FormData();
    formData.append("name", "연철");
    mockedPost.mockResolvedValue({ status: 200, data: { success: true } });

    await expect(sendMessage(formData)).resolves.toEqual({
      status: 200,
      data: { success: true },
    });
    expect(mockedPost).toHaveBeenCalledWith(
      "https://api.web3forms.com/submit",
      formData,
    );
  });

  it("상태 코드가 400 이상이면 메시지를 반환한다", async () => {
    mockedPost.mockResolvedValue({
      status: 422,
      statusText: "Unprocessable Entity",
      data: {},
    });

    await expect(sendMessage(new FormData())).resolves.toEqual({
      status: 422,
      message: "Unprocessable Entity",
    });
  });
});
