import { NextApiRequest, NextApiResponse } from "next";

import { sendTechnicalMessage, sendMessageToSession } from "@/services/gemini";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { question, context, sessionId } = req.body;

    console.log("Technical Chat API 요청:", {
      question:
        question?.substring(0, 50) + (question?.length > 50 ? "..." : ""),
      hasContext: !!context,
      contextKeys: context ? Object.keys(context) : [],
      sessionId: sessionId || "새 세션",
    });

    if (!question || typeof question !== "string") {
      console.error("잘못된 요청: 질문이 없거나 문자열이 아님");
      return res.status(400).json({ error: "질문이 필요합니다." });
    }

    let result;

    // sessionId가 있으면 기존 세션에 메시지 전송, 없으면 새 세션 생성
    if (sessionId) {
      result = await sendMessageToSession(sessionId, question);
    } else {
      result = await sendTechnicalMessage(question, context);
    }

    console.log("Technical Chat API 성공 응답:", {
      replyLength: result?.reply?.length || 0,
      hasReply: !!result?.reply,
      sessionId: result?.sessionId,
    });

    res.status(200).json({
      reply: result.reply,
      sessionId: result.sessionId,
      timestamp: new Date().toISOString(),
      question:
        question.substring(0, 100) + (question.length > 100 ? "..." : ""),
    });
  } catch (error: any) {
    console.error("Technical Chat API Error 상세:", {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
      code: error?.code,
    });

    res.status(500).json({
      error: "서버 오류가 발생했습니다.",
      message: error instanceof Error ? error.message : "Unknown error",
      details:
        process.env.NODE_ENV === "development" ? error?.stack : undefined,
    });
  }
}
