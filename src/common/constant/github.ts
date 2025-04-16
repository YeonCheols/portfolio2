export const GITHUB_ACCOUNTS = [
  // {
  //   username: 'ryan-sirka',
  //   token: process.env.GITHUB_READ_USER_TOKEN_WORK,
  //   endpoint: '/api/github?type=work',
  //   type: 'work',
  //   is_active: true,
  // },
  {
    username: process.env.GITHUB_USER_NAME || '',
    token: process.env.GITHUB_ACCESS_TOKEN,
    endpoint: '/api/github?type=personal',
    type: 'personal',
    is_active: true,
  },
];
