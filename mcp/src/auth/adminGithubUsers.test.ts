import { isAdminGithubUser } from "@mcp/auth/adminGithubUsers";

describe("MCP admin GitHub users", () => {
  it("관리자 계정 파일에 등록된 GitHub ID만 허용한다", () => {
    expect(isAdminGithubUser("91575756")).toBe(true);
    expect(isAdminGithubUser("12345678")).toBe(false);
  });
});
