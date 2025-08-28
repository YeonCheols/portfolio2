import React, { useState } from "react";
import { createGuestbookComment } from "@/services/guestbook";
import { CreateGuestbookComment } from "@/common/types/guestbook";
import Button from "@/common/components/elements/Button";

interface CommentFormProps {
  guestbookId: string;
  onSuccess?: () => void;
}

const CommentForm: React.FC<CommentFormProps> = ({
  guestbookId,
  onSuccess,
}) => {
  const [formData, setFormData] = useState<
    Omit<CreateGuestbookComment, "guestbookId">
  >({
    name: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const commentData: CreateGuestbookComment = {
        ...formData,
        guestbookId,
      };

      const success = await createGuestbookComment(commentData);
      if (success) {
        setFormData({ name: "", message: "" });
        onSuccess?.();
      } else {
        setError("댓글 작성에 실패했습니다. 다시 시도해주세요.");
      }
    } catch (err) {
      setError("댓글 작성 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 mb-4">
      <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
        댓글 작성하기
      </h4>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex gap-3">
          <div className="flex-1">
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              maxLength={50}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="이름"
            />
          </div>
        </div>

        <div>
          <textarea
            name="message"
            value={formData.message}
            onChange={handleChange}
            required
            maxLength={300}
            rows={2}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white resize-none"
            placeholder="댓글을 입력해주세요"
          />
          <p className="text-xs text-gray-500 mt-1">
            {formData.message.length}/300자
          </p>
        </div>

        {error && (
          <div className="text-red-600 dark:text-red-400 text-sm">{error}</div>
        )}

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={
              isSubmitting || !formData.name.trim() || !formData.message.trim()
            }
            className="px-4 py-2 text-sm"
          >
            {isSubmitting ? "작성 중..." : "댓글 작성"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default CommentForm;
