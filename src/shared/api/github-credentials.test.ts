import type { AxiosStatic } from "axios";

jest.mock("axios");

const originalEnv = {
  NEXT_PUBLIC_GITHUB_USER_NAME: process.env.NEXT_PUBLIC_GITHUB_USER_NAME,
  GITHUB_ACCESS_TOKEN: process.env.GITHUB_ACCESS_TOKEN,
  NEXT_PUBLIC_GITHUB_ACCESS_TOKEN: process.env.NEXT_PUBLIC_GITHUB_ACCESS_TOKEN,
};

const restoreEnv = (key: keyof typeof originalEnv) => {
  const value = originalEnv[key];
  if (value === undefined) {
    delete process.env[key];
    return;
  }
  process.env[key] = value;
};

const loadGithub = async () => {
  jest.resetModules();
  const axiosModule = await import("axios");
  const client = axiosModule.default as AxiosStatic;
  const github = await import("@/shared/api/github");
  return { client, github };
};

describe("getGithubUser credentials", () => {
  afterAll(() => {
    restoreEnv("NEXT_PUBLIC_GITHUB_USER_NAME");
    restoreEnv("GITHUB_ACCESS_TOKEN");
    restoreEnv("NEXT_PUBLIC_GITHUB_ACCESS_TOKEN");
  });

  it("NEXT_PUBLIC_GITHUB_ACCESS_TOKEN만 있으면 예외를 던진다", async () => {
    process.env.NEXT_PUBLIC_GITHUB_USER_NAME = "yeoncheols";
    delete process.env.GITHUB_ACCESS_TOKEN;
    process.env.NEXT_PUBLIC_GITHUB_ACCESS_TOKEN = "public-token";

    const { github } = await loadGithub();

    await expect(github.getGithubUser("personal")).rejects.toThrow(
      "GitHub credentials not configured. Set GITHUB_ACCESS_TOKEN and NEXT_PUBLIC_GITHUB_USER_NAME in .env.local",
    );
  });

  it("GITHUB_ACCESS_TOKEN으로 GitHub를 조회한다", async () => {
    process.env.NEXT_PUBLIC_GITHUB_USER_NAME = "yeoncheols";
    process.env.GITHUB_ACCESS_TOKEN = "server-token";
    delete process.env.NEXT_PUBLIC_GITHUB_ACCESS_TOKEN;

    const { client, github } = await loadGithub();
    (client.post as jest.Mock).mockResolvedValue({
      status: 200,
      data: { data: { user: { login: "yeoncheols" } } },
    });

    await expect(github.getGithubUser("personal")).resolves.toEqual({
      status: 200,
      data: { login: "yeoncheols" },
    });
    expect(client.post).toHaveBeenCalledWith(
      "https://api.github.com/graphql",
      expect.any(Object),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer server-token",
        }),
      }),
    );
  });
});
