import React from "react";
import {
  captureError,
  captureMessage,
  setUser,
  setTag,
  handleApiError,
} from "@/common/libs/sentry";

const SentryExample = () => {
  const handleTestError = () => {
    try {
      // 의도적으로 에러 발생
      throw new Error("This is a test error for Sentry");
    } catch (error) {
      captureError(error as Error, {
        component: "SentryExample",
        action: "test_error",
      });
    }
  };

  const handleTestMessage = () => {
    // 명시적으로 error 레벨 사용
    captureMessage("Error level test message", "error");
    captureMessage("Warning level test message", "warning");
    captureMessage("Info level test message", "info");

    // 기본값으로 error 레벨 사용
    captureMessage("Default error level message");
  };

  const handleSetUser = () => {
    setUser({
      id: "ycseng",
      email: "s929290@gmail.com",
      username: "ycseng",
    });
    captureMessage("User information set", "info");
  };

  const handleSetTag = () => {
    setTag("feature", "sentry-test");
    setTag("environment", process.env.NODE_ENV || "development");
    captureMessage("Tags set successfully", "info");
  };

  const handleApiHandle = () => {
    // API 에러 시뮬레이션
    const mockApiError = new Error("API request failed");
    handleApiError(mockApiError, "/api/test");
  };

  const handlePerformanceTest = () => {
    // 성능 모니터링 예시
    captureMessage("Performance test started");

    // 작업 시뮬레이션
    setTimeout(() => {
      captureMessage("Performance test completed");
    }, 1000);
  };

  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
        Sentry 테스트 도구
      </h2>
      <div className="space-y-3">
        <button
          onClick={handleTestError}
          className="w-full px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
        >
          에러 발생 테스트
        </button>

        <button
          onClick={handleTestMessage}
          className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          메시지 캡처 테스트
        </button>

        <button
          onClick={handleSetUser}
          className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
        >
          사용자 정보 설정
        </button>

        <button
          onClick={handleSetTag}
          className="w-full px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors"
        >
          태그 설정
        </button>

        <button
          onClick={handleApiHandle}
          className="w-full px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors"
        >
          API 에러 시뮬레이션
        </button>

        <button
          onClick={handlePerformanceTest}
          className="w-full px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 transition-colors"
        >
          성능 모니터링 테스트
        </button>
      </div>

      <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-700 rounded text-sm text-gray-700 dark:text-gray-300">
        <p>각 버튼을 클릭하면 Sentry에 해당 이벤트가 전송됩니다.</p>
        <p className="mt-2">Sentry 대시보드에서 이벤트를 확인할 수 있습니다.</p>
      </div>
    </div>
  );
};

export default SentryExample;
