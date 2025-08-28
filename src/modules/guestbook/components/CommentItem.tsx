import React from "react";
import { GuestbookComment } from "@/common/types/guestbook";

interface CommentItemProps {
  comment: GuestbookComment;
}

const CommentItem: React.FC<CommentItemProps> = ({ comment }) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="flex space-x-3 py-3 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
      <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
        <span className="text-white font-semibold text-xs">
          {comment.name.charAt(0).toUpperCase()}
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2 mb-1">
          <h5 className="text-sm font-medium text-gray-900 dark:text-white truncate">
            {comment.name}
          </h5>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {formatDate(comment.createdAt)}
          </span>
        </div>

        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
          {comment.message}
        </p>
      </div>
    </div>
  );
};

export default CommentItem;
