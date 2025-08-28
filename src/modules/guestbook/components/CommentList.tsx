import React, { useState, useEffect } from "react";
import { GuestbookComment } from "@/common/types/guestbook";
import { getGuestbookComments } from "@/services/guestbook";
import CommentItem from "./CommentItem";
import Loading from "@/common/components/elements/Loading";

interface CommentListProps {
  guestbookId: string;
  refreshTrigger?: number;
}

const CommentList: React.FC<CommentListProps> = ({
  guestbookId,
  refreshTrigger = 0,
}) => {
  const [comments, setComments] = useState<GuestbookComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  const fetchComments = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await getGuestbookComments(guestbookId);
      setComments(data);
    } catch (err) {
      setError("댓글을 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [guestbookId, refreshTrigger]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-4">
        <Loading />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-4">
        <p className="text-red-600 dark:text-red-400 text-sm mb-2">{error}</p>
        <button
          onClick={fetchComments}
          className="px-3 py-1 text-xs bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
        >
          다시 시도
        </button>
      </div>
    );
  }

  if (comments.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          아직 댓글이 없습니다.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {comments.map((comment) => (
        <CommentItem key={comment.id} comment={comment} />
      ))}
    </div>
  );
};

export default CommentList;
