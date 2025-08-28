import React, { useState, useEffect } from "react";
import { GuestbookEntry } from "@/common/types/guestbook";
import { getGuestbookEntries } from "@/services/guestbook";
import GuestbookItem from "./GuestbookItem";
import Loading from "@/common/components/elements/Loading";

interface GuestbookListProps {
  refreshTrigger?: number;
}

const GuestbookList: React.FC<GuestbookListProps> = ({
  refreshTrigger = 0,
}) => {
  const [entries, setEntries] = useState<GuestbookEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  const fetchEntries = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await getGuestbookEntries();
      setEntries(data);
    } catch (err) {
      setError("방명록을 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, [refreshTrigger]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loading />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
        <button
          onClick={fetchEntries}
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
        >
          다시 시도
        </button>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 dark:text-gray-500 mb-4">
          <svg
            className="mx-auto h-12 w-12"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          아직 방명록이 없습니다
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          첫 번째 방명록을 작성해보세요!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {entries.map((entry) => (
        <GuestbookItem key={entry.id} entry={entry} />
      ))}
    </div>
  );
};

export default GuestbookList;
