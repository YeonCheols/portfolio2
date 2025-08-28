import { NextApiRequest, NextApiResponse } from "next";
import {
  GuestbookComment,
  CreateGuestbookComment,
  GuestbookCommentResponse,
} from "@/common/types/guestbook";

// 간단한 인메모리 저장소 (실제 프로덕션에서는 데이터베이스 사용 권장)
let guestbookComments: GuestbookComment[] = [];

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GuestbookCommentResponse>,
) {
  const { id: guestbookId } = req.query;

  if (req.method === "GET") {
    try {
      // 특정 방명록의 댓글만 필터링
      const comments = guestbookComments.filter(
        (comment) => comment.guestbookId === guestbookId,
      );

      // 최신 순으로 정렬
      const sortedComments = [...comments].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );

      res.status(200).json({
        success: true,
        data: sortedComments,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "댓글을 불러오는 중 오류가 발생했습니다.",
      });
    }
  } else if (req.method === "POST") {
    try {
      const { name, message }: CreateGuestbookComment = req.body;

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

      if (message.length > 300) {
        return res.status(400).json({
          success: false,
          message: "댓글은 300자 이하로 입력해주세요.",
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

      const newComment: GuestbookComment = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        guestbookId: guestbookId as string,
        name: sanitizedName,
        message: sanitizedMessage,
        createdAt: new Date().toISOString(),
        ip:
          (req.headers["x-forwarded-for"] as string) ||
          req.socket.remoteAddress,
        userAgent: req.headers["user-agent"],
      };

      guestbookComments.push(newComment);

      res.status(201).json({
        success: true,
        message: "댓글이 성공적으로 작성되었습니다.",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "댓글 작성 중 오류가 발생했습니다.",
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
