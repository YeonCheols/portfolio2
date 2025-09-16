import axios from "axios";

import { GITHUB_ACCOUNTS } from "@/common/constant/github";

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
        Authorization: `bearer ${token}`,
      },
    },
  );

  const status: number = response.status;
  const responseJson = response.data;

  if (status > 400) {
    return { status, data: {} };
  }

  return { status, data: responseJson.data.user };
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
    throw new Error("Invalid user info");
  }

  return await fetchGithubData(username, token);
};
