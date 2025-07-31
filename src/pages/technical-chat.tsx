import { NextSeo } from "next-seo";
import { TechnicalChat } from "@/modules/chat";

export default function TechnicalChatPage() {
  return (
    <>
      <NextSeo
        title="기술 멘토 챗봇"
        description="프로그래밍과 기술에 대한 질문을 AI 멘토에게 물어보세요!"
        canonical="https://yourdomain.com/technical-chat"
      />

      <div className="min-h-screen bg-gray-50 dark:bg-neutral-900 py-8">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-neutral-100 mb-4">
                🤖 기술 멘토 챗봇
              </h1>
              <p className="text-lg text-gray-600 dark:text-neutral-400">
                프로그래밍, 개발, 기술에 대한 모든 질문을 AI 멘토에게
                물어보세요!
              </p>
            </div>

            <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-lg overflow-hidden border border-gray-200 dark:border-neutral-700">
              <TechnicalChat />
            </div>

            <div className="mt-8 text-center text-sm text-gray-500 dark:text-neutral-400">
              <p>💡 질문 예시:</p>
              <div className="mt-2 space-y-1">
                <p>"React hooks는 어떻게 사용하나요?"</p>
                <p>"TypeScript와 JavaScript의 차이점은?"</p>
                <p>"Next.js에서 API 라우트를 만드는 방법은?"</p>
                <p>"웹 성능 최적화 방법을 알려주세요"</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
