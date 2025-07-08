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
    const { data } = await axios.get(`${process.env.API_URL}/tag`);

    res.status(200).json({ status: true, data });
  } catch (error) {
    res.status(200).json({ status: false, error: error });
  }
}
