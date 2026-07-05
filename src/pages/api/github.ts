import { NextApiRequest, NextApiResponse } from "next";

import { getGithubUser } from "@/shared/api/github";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const queryParams = req.query;

  let type = "";

  if (typeof queryParams.type === "string") {
    type = queryParams.type;
  } else if (Array.isArray(queryParams.type)) {
    type = queryParams.type[0];
  }

  try {
    const response = await getGithubUser(type);

    if (response.status >= 400) {
      return res.status(503).json(null);
    }

    return res.status(response.status).json(response.data);
  } catch (error) {
    console.warn("GitHub API 호출 실패:", error);
    return res.status(503).json(null);
  }
}
