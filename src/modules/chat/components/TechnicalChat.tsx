import { useState } from "react";
import axios from "axios";

interface Message {
  id: string;
  type: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface TechnicalChatProps {
  isWidget?: boolean;
}

const TechnicalChat = ({ isWidget = false }: TechnicalChatProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      const response = await axios.post("/api/technical-chat", {
        question: inputValue,
        sessionId: sessionId, // 기존 세션이 있으면 전송
      });

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content: response.data.reply,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // 새로운 세션 ID 저장 (첫 번째 메시지인 경우)
      if (response.data.sessionId && !sessionId) {
        setSessionId(response.data.sessionId);
      }
    } catch (error) {
      console.error("Chat error:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content:
          "죄송합니다. 답변을 생성하는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setSessionId(null);
  };

  return (
    <div
      className={`flex flex-col h-full ${isWidget ? "max-w-md" : "max-w-4xl"}`}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-t-lg">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold">🤖 기술 멘토</h3>
            <p className="text-sm opacity-90">
              프로그래밍과 기술에 대한 질문을 해주세요!
            </p>
          </div>
          {messages.length > 0 && (
            <button
              onClick={handleNewChat}
              className="px-3 py-1 bg-white bg-opacity-20 hover:bg-opacity-30 rounded text-sm transition-colors duration-200"
              title="새로운 대화 시작"
            >
              새 대화
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-neutral-900">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 dark:text-neutral-400 py-8">
            <div className="text-4xl mb-2">💬</div>
            <p>기술적인 질문을 해주세요!</p>
            <p className="text-sm mt-2">예: React hooks는 어떻게 사용하나요?</p>
            <p className="text-xs mt-1 text-gray-400 dark:text-neutral-500">
              이전 대화 내용을 기억합니다
            </p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] p-3 rounded-lg ${
                message.type === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700"
              }`}
            >
              <div className="whitespace-pre-wrap text-gray-900 dark:text-neutral-100">
                {message.content}
              </div>
              <div
                className={`text-xs mt-1 ${
                  message.type === "user"
                    ? "text-blue-100"
                    : "text-gray-400 dark:text-neutral-500"
                }`}
              >
                {message.timestamp.toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 p-3 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-gray-500 dark:text-neutral-400">
                  답변을 생성하고 있습니다...
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 bg-white dark:bg-neutral-900 border-t border-gray-200 dark:border-neutral-700">
        <div className="flex space-x-2">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="기술적인 질문을 입력하세요..."
            className="flex-1 p-3 border border-gray-300 dark:border-neutral-600 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100 placeholder-gray-500 dark:placeholder-neutral-400"
            rows={2}
            disabled={isLoading}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            전송
          </button>
        </div>
      </div>
    </div>
  );
};

export default TechnicalChat;
