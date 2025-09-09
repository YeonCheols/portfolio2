import { NextApiRequest, NextApiResponse } from "next";

import axios from "axios";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const { formData } = req.body;

  try {
    await axios.post(`${process.env.API_URL}/mail/send`, formData);

    res.status(200).json({ status: 200 });
  } catch (error) {
    console.error("your error: ", error);
    res.status(500).json({ error: "Something went wrong!" });
  }
}
