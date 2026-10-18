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

describe("GITHUB_ACCOUNTS", () => {
  afterAll(() => {
    restoreEnv("NEXT_PUBLIC_GITHUB_USER_NAME");
    restoreEnv("GITHUB_ACCESS_TOKEN");
    restoreEnv("NEXT_PUBLIC_GITHUB_ACCESS_TOKEN");
  });

  it("토큰 필드를 넣지 않고 공개 계정만 둔다", async () => {
    jest.resetModules();
    process.env.NEXT_PUBLIC_GITHUB_USER_NAME = "yeoncheols";
    process.env.GITHUB_ACCESS_TOKEN = "server-token";
    process.env.NEXT_PUBLIC_GITHUB_ACCESS_TOKEN = "public-token";

    const { GITHUB_ACCOUNTS } = await import("@/shared/config/github");

    expect(GITHUB_ACCOUNTS).toEqual([
      {
        username: "yeoncheols",
        endpoint: "/api/github?type=personal",
        type: "personal",
        is_active: true,
      },
    ]);
  });
});
