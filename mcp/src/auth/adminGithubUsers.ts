const ADMIN_GITHUB_USER_IDS = new Set(["91575756"]);

export const isAdminGithubUser = (userId: string): boolean =>
  ADMIN_GITHUB_USER_IDS.has(userId);
