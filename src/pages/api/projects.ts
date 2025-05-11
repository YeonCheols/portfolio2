import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@/common/libs/prisma";

type Data = {
  status: boolean;
  data?: any;
  error?: any;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>,
) {
  try {
    const pageNumber = Number(req.query?.page);
    const pageSize = Number(req.query?.size);
    let response = {};

    if (pageNumber && pageSize) {
      response = await prisma.projects.findMany({
        skip: (pageNumber - 1) * 5,
        take: pageSize,
        orderBy: [
          {
            is_featured: "desc",
          },
          {
            updated_at: "desc",
          },
        ],
      });
    } else {
      response = await prisma.projects.findMany({
        orderBy: [
          {
            is_featured: "desc",
          },
          {
            updated_at: "desc",
          },
        ],
      });
    }

    res.status(200).json({ status: true, data: response });
  } catch (error) {
    res.status(200).json({ status: false, error: error });
  }
}
