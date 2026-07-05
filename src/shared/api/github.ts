import axios from "axios";

import { GITHUB_ACCOUNTS } from "@/shared/config/github";

const GITHUB_USER_ENDPOINT = "https://api.github.com/graphql";

const GITHUB_USER_QUERY = `query($username: String!) {
  user(login: $username) {
    login
    name
    bio
    avatarUrl
    location
    websiteUrl
    twitterUsername
    company
    email
    followers {
      totalCount
    }
    following {
      totalCount
    }
    repositories(first: 100, orderBy: {field: UPDATED_AT, direction: DESC}) {
      totalCount
      nodes {
        name
        description
        url
        stargazerCount
        forkCount
        primaryLanguage {
          name
          color
        }
        updatedAt
        defaultBranchRef {
          target {
            ... on Commit {
              history(first: 100) {
                totalCount
                nodes {
                  message
                  committedDate
                  author {
                    name
                    email
                    user {
                      login
                    }
                  }
                  additions
                  deletions
                  changedFiles
                }
              }
            }
          }
        }
      }
    }
    contributionsCollection {
      contributionCalendar {
        colors
        totalContributions
        months {
          firstDay
          name
          totalWeeks
        }
        weeks {
          contributionDays {
            color
            contributionCount
            date
          }
          firstDay
        }
      }
      totalCommitContributions
      totalIssueContributions
      totalPullRequestContributions
      totalPullRequestReviewContributions
      totalRepositoryContributions
      contributionYears
      contributionMonths: contributionCalendar {
        totalContributions
      }
      contributionDays: contributionCalendar {
        totalContributions
      }
    }
    pinnedItems(first: 6, types: REPOSITORY) {
      nodes {
        ... on Repository {
          name
          description
          url
          stargazerCount
          forkCount
          primaryLanguage {
            name
            color
          }
          defaultBranchRef {
            target {
              ... on Commit {
                history(first: 100) {
                  totalCount
                  nodes {
                    message
                    committedDate
                    author {
                      name
                      email
                      user {
                        login
                      }
                    }
                    additions
                    deletions
                    changedFiles
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}`;

export const fetchGithubData = async (username: string, token: string) => {
  try {
    const response = await axios.post(
      GITHUB_USER_ENDPOINT,
      {
        query: GITHUB_USER_QUERY,
        variables: {
          username: username,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        validateStatus: (status) => status < 500,
      },
    );

    const status = response.status;
    const responseJson = response.data;

    if (status >= 400 || responseJson.errors?.length) {
      const message =
        responseJson.errors?.[0]?.message ??
        responseJson.message ??
        `GitHub API responded with ${status}`;

      console.warn(`GitHub API ${status}: ${message}`);
      return { status: status >= 400 ? status : 401, data: null };
    }

    return { status, data: responseJson.data?.user ?? null };
  } catch (error) {
    console.warn("GitHub API 호출 실패:", error);
    return { status: 503, data: null };
  }
};

export const getGithubUser = async (type: string) => {
  const account = GITHUB_ACCOUNTS.find(
    (account) => account?.type === type && account?.is_active,
  );

  if (!account) {
    throw new Error("Invalid user type");
  }

  const { username, token } = account;
  if (!token || !username) {
    throw new Error(
      "GitHub credentials not configured. Set GITHUB_ACCESS_TOKEN (or NEXT_PUBLIC_GITHUB_ACCESS_TOKEN) and NEXT_PUBLIC_GITHUB_USER_NAME in .env.local",
    );
  }

  return await fetchGithubData(username, token);
};
