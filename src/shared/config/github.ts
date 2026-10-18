export const GITHUB_ACCOUNTS = [
  {
    username: process.env.NEXT_PUBLIC_GITHUB_USER_NAME || "",
    endpoint: "/api/github?type=personal",
    type: "personal",
    is_active: true,
  },
];
