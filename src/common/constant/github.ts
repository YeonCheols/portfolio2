export const GITHUB_ACCOUNTS = [
  {
    username: process.env.NEXT_PUBLIC_GITHUB_USER_NAME || "",
    token: process.env.NEXT_PUBLIC_GITHUB_ACCESS_TOKEN,
    endpoint: "/api/github?type=personal",
    type: "personal",
    is_active: true,
  },
];
