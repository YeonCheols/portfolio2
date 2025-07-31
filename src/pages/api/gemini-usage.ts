import { NextApiRequest, NextApiResponse } from "next";
import { getGeminiUsageData } from "@/services/gemini-usage";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  // API 라우트에서도 접근 제어
  const isDevMode = process.env.GEMINI_USAGE_PAGE === "true";

  if (!isDevMode) {
    return res.status(404).json({ error: "Not found" });
  }
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // 서비스 함수를 사용하여 데이터 가져오기
    const data = await getGeminiUsageData();
    return res.status(200).json(data);
  } catch (error: any) {
    console.error("API 라우트 에러:", error);
    return res.status(500).json({
      error: error.message || "서버 오류가 발생했습니다.",
    });
  }
}
