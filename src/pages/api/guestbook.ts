import { NextApiRequest, NextApiResponse } from "next";
import {
  GuestbookEntry,
  CreateGuestbookEntry,
  GuestbookResponse,
} from "@/common/types/guestbook";

// 간단한 인메모리 저장소 (실제 프로덕션에서는 데이터베이스 사용 권장)
let guestbookEntries: GuestbookEntry[] = [];

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GuestbookResponse>,
) {
  if (req.method === "GET") {
    try {
      // 최신 순으로 정렬
      const sortedEntries = [...guestbookEntries].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );

      res.status(200).json({
        success: true,
        data: sortedEntries,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "방명록을 불러오는 중 오류가 발생했습니다.",
      });
    }
  } else if (req.method === "POST") {
    try {
      const { name, message }: CreateGuestbookEntry = req.body;

      // 입력 검증
      if (!name || !message) {
        return res.status(400).json({
          success: false,
          message: "이름과 메시지를 모두 입력해주세요.",
        });
      }

      if (name.length > 50) {
        return res.status(400).json({
          success: false,
          message: "이름은 50자 이하로 입력해주세요.",
        });
      }

      if (message.length > 500) {
        return res.status(400).json({
          success: false,
          message: "메시지는 500자 이하로 입력해주세요.",
        });
      }

      // XSS 방지를 위한 간단한 필터링
      const sanitizedName = name.replace(
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
        "",
      );
      const sanitizedMessage = message.replace(
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
        "",
      );

      const newEntry: GuestbookEntry = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        name: sanitizedName,
        message: sanitizedMessage,
        createdAt: new Date().toISOString(),
        ip:
          (req.headers["x-forwarded-for"] as string) ||
          req.socket.remoteAddress,
        userAgent: req.headers["user-agent"],
      };

      guestbookEntries.push(newEntry);

      res.status(201).json({
        success: true,
        message: "방명록이 성공적으로 작성되었습니다.",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "방명록 작성 중 오류가 발생했습니다.",
      });
    }
  } else {
    res.setHeader("Allow", ["GET", "POST"]);
    res.status(405).json({
      success: false,
      message: "허용되지 않는 메서드입니다.",
    });
  }
}
