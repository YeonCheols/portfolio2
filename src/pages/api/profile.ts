import axios from "axios";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  try {
    const { data } = await axios.get(`${process.env.API_URL}/profile`);

    res.status(200).json({ status: 200, data });
  } catch (error) {
    res.status(500).json({ status: 500, error: error });
  }
}
