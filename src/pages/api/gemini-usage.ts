import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  return res.status(200).json({
    message: "Gemini 사용량 조회 기능이 제거되었습니다.",
    note: "실제 사용량은 Google Cloud Console의 Billing Reports에서 확인하세요.",
    dataSource: "Google Cloud Console",
  });
}
