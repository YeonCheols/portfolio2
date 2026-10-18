import axios from "axios";

import { fetchGithubData, getGithubUser } from "@/shared/api/github";

jest.mock("axios");
jest.mock("@/shared/config/github", () => ({
  GITHUB_ACCOUNTS: [
    {
      type: "personal",
      is_active: true,
      username: "yeoncheols",
    },
  ],
}));

const mockedPost = axios.post as jest.MockedFunction<typeof axios.post>;

describe("fetchGithubData", () => {
  it("사용자 데이터를 반환한다", async () => {
    mockedPost.mockResolvedValue({
      status: 200,
      data: { data: { user: { login: "yeoncheols" } } },
    });

    await expect(fetchGithubData("yeoncheols", "token")).resolves.toEqual({
      status: 200,
      data: { login: "yeoncheols" },
    });
  });

  it("인증 오류면 data를 null로 반환한다", async () => {
    mockedPost.mockResolvedValue({
      status: 401,
      data: { message: "Bad credentials" },
    });

    await expect(fetchGithubData("yeoncheols", "token")).resolves.toEqual({
      status: 401,
      data: null,
    });
  });

  it("호출이 실패하면 503을 반환한다", async () => {
    mockedPost.mockRejectedValue(new Error("network"));

    await expect(fetchGithubData("yeoncheols", "token")).resolves.toEqual({
      status: 503,
      data: null,
    });
  });
});

describe("getGithubUser", () => {
  it("없는 타입이면 예외를 던진다", async () => {
    await expect(getGithubUser("unknown")).rejects.toThrow("Invalid user type");
  });
});
