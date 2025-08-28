import React, { useState } from "react";
import { GuestbookEntry } from "@/common/types/guestbook";
import CommentForm from "./CommentForm";
import CommentList from "./CommentList";

interface GuestbookItemProps {
  entry: GuestbookEntry;
}

const GuestbookItem: React.FC<GuestbookItemProps> = ({ entry }) => {
  const [showComments, setShowComments] = useState(false);
  const [commentRefreshTrigger, setCommentRefreshTrigger] = useState(0);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleCommentSuccess = () => {
    setCommentRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-4 border border-gray-200 dark:border-gray-700">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <span className="text-white font-semibold text-sm">
              {entry.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white">
              {entry.name}
            </h4>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {formatDate(entry.createdAt)}
            </p>
          </div>
        </div>
      </div>

      <div className="ml-13 mb-4">
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
          {entry.message}
        </p>
      </div>

      {/* 댓글 토글 버튼 */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
        <button
          onClick={() => setShowComments(!showComments)}
          className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
        >
          <svg
            className={`w-4 h-4 transition-transform ${showComments ? "rotate-90" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
          <span>댓글 {showComments ? "숨기기" : "보기"}</span>
        </button>
      </div>

      {/* 댓글 섹션 */}
      {showComments && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <CommentForm
            guestbookId={entry.id}
            onSuccess={handleCommentSuccess}
          />
          <CommentList
            guestbookId={entry.id}
            refreshTrigger={commentRefreshTrigger}
          />
        </div>
      )}
    </div>
  );
};

export default GuestbookItem;
