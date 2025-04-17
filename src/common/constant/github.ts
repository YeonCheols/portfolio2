export const GITHUB_ACCOUNTS = [
  {
    username: process.env.GITHUB_USER_NAME || "",
    token: process.env.GITHUB_ACCESS_TOKEN,
    endpoint: "/api/github?type=personal",
    type: "personal",
    is_active: true,
  },
];
