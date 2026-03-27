import { NextApiRequest, NextApiResponse } from "next";

interface ResponseData {
  views: number;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const { slug } = req.query;

  if (req.method === "GET") {
    try {
      const response: ResponseData = {
        views: 0,
      };

      return res.json(response);
    } catch (error) {
      return res.status(500).json({ error: "Failed to fetch content meta" });
    }
  } else if (req.method === "POST") {
    try {
    } catch (error) {
      return res.status(500).json({ error: "Failed to update views count" });
    }
  } else {
    return res.status(405).json({ error: "Method not allowed" });
  }
}
