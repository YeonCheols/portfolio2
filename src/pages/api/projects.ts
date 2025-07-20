import type { NextApiRequest, NextApiResponse } from "next";

import axios from "axios";

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

    const requestParams = {
      page: pageNumber,
      size: pageSize,
    };
    const { data } = await axios.get(`${process.env.API_URL}/project/search`, {
      params: requestParams,
    });

    res.status(200).json({ status: true, data });
  } catch (error) {
    res.status(200).json({ status: false, error: error });
  }
}
