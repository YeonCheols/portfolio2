import React, { useState } from "react";
import { createGuestbookEntry } from "@/services/guestbook";
import { CreateGuestbookEntry } from "@/common/types/guestbook";
import Button from "@/common/components/elements/Button";

interface GuestbookFormProps {
  onSuccess?: () => void;
}

const GuestbookForm: React.FC<GuestbookFormProps> = ({ onSuccess }) => {
  const [formData, setFormData] = useState<CreateGuestbookEntry>({
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
      const success = await createGuestbookEntry(formData);
      if (success) {
        setFormData({ name: "", message: "" });
        onSuccess?.();
      } else {
        setError("방명록 작성에 실패했습니다. 다시 시도해주세요.");
      }
    } catch (err) {
      setError("방명록 작성 중 오류가 발생했습니다.");
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
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
      <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
        방명록 작성하기
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            이름 *
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            maxLength={50}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            placeholder="이름을 입력해주세요"
          />
          <p className="text-xs text-gray-500 mt-1">
            {formData.name.length}/50자
          </p>
        </div>

        <div>
          <label
            htmlFor="message"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            메시지 *
          </label>
          <textarea
            id="message"
            name="message"
            value={formData.message}
            onChange={handleChange}
            required
            maxLength={500}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white resize-none"
            placeholder="메시지를 입력해주세요"
          />
          <p className="text-xs text-gray-500 mt-1">
            {formData.message.length}/500자
          </p>
        </div>

        {error && (
          <div className="text-red-600 dark:text-red-400 text-sm">{error}</div>
        )}

        <Button
          type="submit"
          disabled={
            isSubmitting || !formData.name.trim() || !formData.message.trim()
          }
          className="w-full"
        >
          {isSubmitting ? "작성 중..." : "방명록 작성하기"}
        </Button>
      </form>
    </div>
  );
};

export default GuestbookForm;
