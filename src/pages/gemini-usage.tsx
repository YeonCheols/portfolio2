import { useState } from "react";
import { NextSeo } from "next-seo";
import Loading from "@/common/components/elements/Loading";
import { GetServerSideProps } from "next";
import {
  getGeminiUsageData,
  UnifiedApiResponse,
} from "@/services/gemini-usage";

interface PageProps {
  initialData: UnifiedApiResponse | null;
  error?: string;
}

export default function GeminiUsagePage({ initialData, error }: PageProps) {
  const [apiData, setApiData] = useState<UnifiedApiResponse | null>(
    initialData,
  );
  const [loading, setLoading] = useState(false);

  // 수동 새로고침 함수
  const handleRefresh = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/gemini-usage");
      if (response.ok) {
        const data = await response.json();
        setApiData(data);
      } else {
        throw new Error("데이터를 가져오는데 실패했습니다.");
      }
    } catch (err: any) {
      console.error("새로고침 실패:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <NextSeo
        title="Generative Language API 사용량 및 비용 확인"
        description="Generative Language API 모델 정보, 사용량, 비용을 확인합니다."
        canonical="https://yourdomain.com/gemini-usage"
      />

      <div className="min-h-screen bg-gray-50 dark:bg-neutral-900">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
              🤖 Generative Language API 사용량 및 비용 확인
            </h1>

            {loading && <Loading />}

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 mb-6">
                <h3 className="text-red-800 dark:text-red-200 font-semibold mb-2">
                  오류 발생
                </h3>
                <p className="text-red-700 dark:text-red-300 mb-4">{error}</p>

                {/* socket hang up 오류 특별 처리 */}
                {error.includes("socket hang up") && (
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4">
                    <h4 className="text-yellow-800 dark:text-yellow-200 font-semibold mb-2">
                      🔧 연결 문제 해결 방법
                    </h4>
                    <ul className="text-yellow-700 dark:text-yellow-300 space-y-1 text-sm">
                      <li>• 서버가 실행 중인지 확인하세요 (npm run dev)</li>
                      <li>• 네트워크 연결을 확인하세요</li>
                      <li>• 브라우저를 새로고침해보세요</li>
                      <li>• 잠시 후 다시 시도해보세요</li>
                    </ul>
                  </div>
                )}

                <button
                  onClick={() => window.location.reload()}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                >
                  🔄 다시 시도
                </button>
              </div>
            )}

            {/* 수동 새로고침 버튼 */}
            {!loading && apiData && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-blue-800 dark:text-blue-200 font-semibold mb-1">
                      🔄 데이터 새로고침
                    </h3>
                    <p className="text-blue-700 dark:text-blue-300 text-sm">
                      최신 정보를 가져오려면 새로고침하세요
                    </p>
                  </div>
                  <button
                    onClick={handleRefresh}
                    disabled={loading}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? "🔄 새로고침 중..." : "🔄 새로고침"}
                  </button>
                </div>
              </div>
            )}

            {apiData && (
              <div className="space-y-6">
                {/* API 상태 */}
                <div className="bg-white dark:bg-neutral-800 rounded-lg p-6 shadow-sm">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                    🔑 API 상태
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gray-50 dark:bg-neutral-700 rounded-lg p-4">
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        API 키 상태
                      </div>
                      <div className="text-lg font-semibold text-gray-900 dark:text-white">
                        {apiData.apiStatus.hasApiKey
                          ? "✅ 설정됨"
                          : "❌ 미설정"}
                      </div>
                    </div>
                    <div className="bg-gray-50 dark:bg-neutral-700 rounded-lg p-4">
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        API 키 길이
                      </div>
                      <div className="text-lg font-semibold text-gray-900 dark:text-white">
                        {apiData.apiStatus.apiKeyLength}자
                      </div>
                    </div>
                    <div className="bg-gray-50 dark:bg-neutral-700 rounded-lg p-4">
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        프로젝트 ID
                      </div>
                      <div className="text-lg font-semibold text-gray-900 dark:text-white">
                        {apiData.billing.projectId || "N/A"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 모델 정보 */}
                <div className="bg-white dark:bg-neutral-800 rounded-lg p-6 shadow-sm">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                    🤖 모델 정보
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                      <div className="text-sm text-blue-600 dark:text-blue-400">
                        모델명
                      </div>
                      <div className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                        {apiData.model.name}
                      </div>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                      <div className="text-sm text-blue-600 dark:text-blue-400">
                        버전
                      </div>
                      <div className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                        {apiData.model.version}
                      </div>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 md:col-span-1">
                      <div className="text-sm text-blue-600 dark:text-blue-400">
                        설명
                      </div>
                      <div className="text-sm text-blue-900 dark:text-blue-100">
                        {apiData.model.description}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 실제 Google Cloud API 데이터 */}
                {apiData.dataSources && (
                  <div className="bg-white dark:bg-neutral-800 rounded-lg p-6 shadow-sm">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                      🔗 데이터 소스 상태
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div
                        className={`rounded-lg p-4 ${
                          apiData.dataSources.tokenUsage === "실제 Gemini API"
                            ? "bg-green-50 dark:bg-green-900/20"
                            : "bg-red-50 dark:bg-red-900/20"
                        }`}
                      >
                        <div
                          className={`text-sm ${
                            apiData.dataSources.tokenUsage === "실제 Gemini API"
                              ? "text-green-600 dark:text-green-400"
                              : "text-red-600 dark:text-red-400"
                          }`}
                        >
                          토큰 사용량
                        </div>
                        <div
                          className={`text-lg font-semibold ${
                            apiData.dataSources.tokenUsage === "실제 Gemini API"
                              ? "text-green-900 dark:text-green-100"
                              : "text-red-900 dark:text-red-100"
                          }`}
                        >
                          {apiData.dataSources.tokenUsage}
                        </div>
                      </div>
                      <div
                        className={`rounded-lg p-4 ${
                          apiData.dataSources.performanceMetrics ===
                          "실제 Google Cloud Monitoring"
                            ? "bg-green-50 dark:bg-green-900/20"
                            : "bg-red-50 dark:bg-red-900/20"
                        }`}
                      >
                        <div
                          className={`text-sm ${
                            apiData.dataSources.performanceMetrics ===
                            "실제 Google Cloud Monitoring"
                              ? "text-green-600 dark:text-green-400"
                              : "text-red-600 dark:text-red-400"
                          }`}
                        >
                          성능 지표
                        </div>
                        <div
                          className={`text-lg font-semibold ${
                            apiData.dataSources.performanceMetrics ===
                            "실제 Google Cloud Monitoring"
                              ? "text-green-900 dark:text-green-100"
                              : "text-red-900 dark:text-red-100"
                          }`}
                        >
                          {apiData.dataSources.performanceMetrics}
                        </div>
                      </div>
                      <div
                        className={`rounded-lg p-4 ${
                          apiData.dataSources.billingData ===
                          "실제 Google Cloud Billing"
                            ? "bg-green-50 dark:bg-green-900/20"
                            : "bg-red-50 dark:bg-red-900/20"
                        }`}
                      >
                        <div
                          className={`text-sm ${
                            apiData.dataSources.billingData ===
                            "실제 Google Cloud Billing"
                              ? "text-green-600 dark:text-green-400"
                              : "text-red-600 dark:text-red-400"
                          }`}
                        >
                          비용 정보
                        </div>
                        <div
                          className={`text-lg font-semibold ${
                            apiData.dataSources.billingData ===
                            "실제 Google Cloud Billing"
                              ? "text-green-900 dark:text-green-100"
                              : "text-red-900 dark:text-red-100"
                          }`}
                        >
                          {apiData.dataSources.billingData}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 실제 비용 정보 */}
                {apiData.billingData && (
                  <div className="bg-white dark:bg-neutral-800 rounded-lg p-6 shadow-sm">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                      💰 실제 비용 정보 (Google Cloud Billing API)
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
                        <div className="text-sm text-purple-600 dark:text-purple-400">
                          실제 월 비용
                        </div>
                        <div className="text-lg font-semibold text-purple-900 dark:text-purple-100">
                          ${apiData.billingData.currentMonthCost.toFixed(6)}
                        </div>
                      </div>
                      <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
                        <div className="text-sm text-purple-600 dark:text-purple-400">
                          데이터 소스
                        </div>
                        <div className="text-sm text-purple-900 dark:text-purple-100">
                          {apiData.billingData.source}
                        </div>
                      </div>
                    </div>

                    {apiData.billingData.services &&
                      apiData.billingData.services.length > 0 && (
                        <div className="bg-gray-50 dark:bg-neutral-700 rounded-lg p-4 mb-4">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                            📋 서비스별 비용
                          </h3>
                          <div className="space-y-2">
                            {apiData.billingData.services.map(
                              (service: any, index: any) => (
                                <div
                                  key={index}
                                  className="flex justify-between text-sm"
                                >
                                  <span className="text-gray-600 dark:text-gray-400">
                                    {service.service}:
                                  </span>
                                  <span className="text-gray-900 dark:text-white font-mono">
                                    {service.cost} {service.currency}
                                  </span>
                                </div>
                              ),
                            )}
                          </div>
                        </div>
                      )}

                    {apiData.billingData.billingPeriod && (
                      <div className="bg-gray-50 dark:bg-neutral-700 rounded-lg p-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                          📅 청구 기간
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">
                              시작일:
                            </span>
                            <span className="text-gray-900 dark:text-white">
                              {new Date(
                                apiData.billingData.billingPeriod.start,
                              ).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">
                              종료일:
                            </span>
                            <span className="text-gray-900 dark:text-white">
                              {new Date(
                                apiData.billingData.billingPeriod.end,
                              ).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 성능 지표 (Google Cloud Console과 유사) */}
                {apiData.performanceMetrics && (
                  <div className="bg-white dark:bg-neutral-800 rounded-lg p-6 shadow-sm">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                      📈 성능 지표 (Google Cloud Console)
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                      <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-4">
                        <div className="text-sm text-indigo-600 dark:text-indigo-400">
                          총 요청 수
                        </div>
                        <div className="text-lg font-semibold text-indigo-900 dark:text-indigo-100">
                          {apiData.performanceMetrics.totalRequests.toLocaleString()}
                        </div>
                      </div>
                      <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
                        <div className="text-sm text-red-600 dark:text-red-400">
                          오류율
                        </div>
                        <div className="text-lg font-semibold text-red-900 dark:text-red-100">
                          {apiData.performanceMetrics.errorRate}%
                        </div>
                      </div>
                      <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                        <div className="text-sm text-green-600 dark:text-green-400">
                          중앙값 지연시간
                        </div>
                        <div className="text-lg font-semibold text-green-900 dark:text-green-100">
                          {apiData.performanceMetrics.medianLatency}ms
                        </div>
                      </div>
                      <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
                        <div className="text-sm text-yellow-600 dark:text-yellow-400">
                          95% 지연시간
                        </div>
                        <div className="text-lg font-semibold text-yellow-900 dark:text-yellow-100">
                          {apiData.performanceMetrics.latency95th.toLocaleString()}
                          ms
                        </div>
                      </div>
                    </div>
                    <div className="bg-gray-50 dark:bg-neutral-700 rounded-lg p-4">
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        <strong>출처:</strong>{" "}
                        {apiData.performanceMetrics.source}
                      </div>
                    </div>
                  </div>
                )}

                {/* 사용량 정보 */}
                {apiData.usage && (
                  <div className="bg-white dark:bg-neutral-800 rounded-lg p-6 shadow-sm">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                      📊 사용량 정보
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                        <div className="text-sm text-green-600 dark:text-green-400">
                          프롬프트 토큰
                        </div>
                        <div className="text-lg font-semibold text-green-900 dark:text-green-100">
                          {apiData.usage.promptTokens.toLocaleString()}
                        </div>
                      </div>
                      <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                        <div className="text-sm text-green-600 dark:text-green-400">
                          응답 토큰
                        </div>
                        <div className="text-lg font-semibold text-green-900 dark:text-green-100">
                          {apiData.usage.candidatesTokenCount.toLocaleString()}
                        </div>
                      </div>
                      <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                        <div className="text-sm text-green-600 dark:text-green-400">
                          총 토큰
                        </div>
                        <div className="text-lg font-semibold text-green-900 dark:text-green-100">
                          {apiData.usage.totalTokenCount.toLocaleString()}
                        </div>
                      </div>
                    </div>

                    {/* 헤더 정보 */}
                    <div className="bg-gray-50 dark:bg-neutral-700 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                        📋 응답 헤더 정보
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        {Object.entries(apiData.usage.responseHeaders).map(
                          ([key, value]) => (
                            <div key={key} className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-400">
                                {key}:
                              </span>
                              <span className="text-gray-900 dark:text-white font-mono">
                                {value || "N/A"}
                              </span>
                            </div>
                          ),
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* 비용 정보 */}
                <div className="bg-white dark:bg-neutral-800 rounded-lg p-6 shadow-sm">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                    💰 비용 정보
                  </h2>

                  {/* 현재 월 비용 요약 */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
                      <div className="text-sm text-purple-600 dark:text-purple-400">
                        현재 월 비용
                      </div>
                      <div className="text-lg font-semibold text-purple-900 dark:text-purple-100">
                        ${apiData.billing.currentMonthCost.toFixed(6)}
                      </div>
                    </div>
                    <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
                      <div className="text-sm text-purple-600 dark:text-purple-400">
                        월 예산 한도
                      </div>
                      <div className="text-lg font-semibold text-purple-900 dark:text-purple-100">
                        ${apiData.billing.budgetLimit}
                      </div>
                    </div>
                    <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
                      <div className="text-sm text-purple-600 dark:text-purple-400">
                        남은 예산
                      </div>
                      <div className="text-lg font-semibold text-purple-900 dark:text-purple-100">
                        ${apiData.billing.remainingBudget.toFixed(2)}
                      </div>
                    </div>
                    <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
                      <div className="text-sm text-purple-600 dark:text-purple-400">
                        사용률
                      </div>
                      <div className="text-lg font-semibold text-purple-900 dark:text-purple-100">
                        {(
                          (apiData.billing.currentMonthCost /
                            apiData.billing.budgetLimit) *
                          100
                        ).toFixed(2)}
                        %
                      </div>
                    </div>
                  </div>

                  {/* 상세 비용 분석 */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
                      <div className="text-sm text-orange-600 dark:text-orange-400">
                        입력 토큰 비용
                      </div>
                      <div className="text-lg font-semibold text-orange-900 dark:text-orange-100">
                        ${apiData.usageCost.inputTokensCost.toFixed(6)}
                      </div>
                    </div>
                    <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
                      <div className="text-sm text-orange-600 dark:text-orange-400">
                        출력 토큰 비용
                      </div>
                      <div className="text-lg font-semibold text-orange-900 dark:text-orange-100">
                        ${apiData.usageCost.outputTokensCost.toFixed(6)}
                      </div>
                    </div>
                    <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
                      <div className="text-sm text-orange-600 dark:text-orange-400">
                        총 비용
                      </div>
                      <div className="text-lg font-semibold text-orange-900 dark:text-orange-100">
                        ${apiData.usageCost.totalCost.toFixed(6)}
                      </div>
                    </div>
                  </div>

                  {/* 가격 정보 */}
                  <div className="bg-gray-50 dark:bg-neutral-700 rounded-lg p-4 mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                      💵 가격 정보
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">
                          입력 토큰 (1K당):
                        </span>
                        <span className="text-gray-900 dark:text-white font-mono">
                          ${apiData.pricing.inputTokensPer1K}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">
                          출력 토큰 (1K당):
                        </span>
                        <span className="text-gray-900 dark:text-white font-mono">
                          ${apiData.pricing.outputTokensPer1K}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">
                          통화:
                        </span>
                        <span className="text-gray-900 dark:text-white font-mono">
                          {apiData.pricing.currency}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">
                          출처:
                        </span>
                        <span className="text-gray-900 dark:text-white font-mono">
                          {apiData.pricing.source}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 예산 진행률 */}
                  <div className="bg-gray-50 dark:bg-neutral-700 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                      📈 예산 진행률
                    </h3>
                    <div className="w-full bg-gray-200 dark:bg-neutral-600 rounded-full h-4 mb-2">
                      <div
                        className="bg-gradient-to-r from-green-400 to-blue-500 h-4 rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min((apiData.billing.currentMonthCost / apiData.billing.budgetLimit) * 100, 100)}%`,
                        }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                      <span>
                        사용됨: ${apiData.billing.currentMonthCost.toFixed(6)}
                      </span>
                      <span>한도: ${apiData.billing.budgetLimit}</span>
                    </div>
                  </div>
                </div>

                {/* 통합 안내 */}
                {apiData.integrationNote && (
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200 mb-3">
                      {apiData.integrationNote.title}
                    </h3>
                    <p className="text-yellow-700 dark:text-yellow-300 mb-4">
                      {apiData.integrationNote.description}
                    </p>
                    <div className="mb-4">
                      <h4 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
                        필요 요구사항:
                      </h4>
                      <ul className="list-disc list-inside text-yellow-700 dark:text-yellow-300 space-y-1">
                        {apiData.integrationNote.requirements.map(
                          (req: any, index: any) => (
                            <li key={index}>{req}</li>
                          ),
                        )}
                      </ul>
                    </div>
                    <div className="space-y-2">
                      {apiData.integrationNote.links.map(
                        (link: any, index: any) => (
                          <a
                            key={index}
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center px-3 py-1 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700 transition-colors mr-2"
                          >
                            🔗 {link.name}
                          </a>
                        ),
                      )}
                    </div>
                  </div>
                )}

                {/* 비용 확인 방법 */}
                {apiData.costCheckMethods && (
                  <div className="bg-white dark:bg-neutral-800 rounded-lg p-6 shadow-sm">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                      🔗 비용 확인 방법
                    </h2>
                    <div className="space-y-4">
                      {apiData.costCheckMethods.map(
                        (method: any, index: any) => (
                          <div
                            key={index}
                            className="bg-gray-50 dark:bg-neutral-700 rounded-lg p-4"
                          >
                            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                              {method.name}
                            </h3>
                            <p className="text-gray-600 dark:text-gray-400 mb-3">
                              {method.description}
                            </p>
                            <a
                              href={method.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                              🔗 바로가기
                            </a>
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                )}

                {/* 사용량 확인 방법 */}
                {apiData.usageCheckMethods && (
                  <div className="bg-white dark:bg-neutral-800 rounded-lg p-6 shadow-sm">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                      🔗 사용량 확인 방법
                    </h2>
                    <div className="space-y-4">
                      {apiData.usageCheckMethods.map(
                        (method: any, index: any) => (
                          <div
                            key={index}
                            className="bg-gray-50 dark:bg-neutral-700 rounded-lg p-4"
                          >
                            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                              {method.name}
                            </h3>
                            <p className="text-gray-600 dark:text-gray-400 mb-3">
                              {method.description}
                            </p>
                            <a
                              href={method.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                              🔗 바로가기
                            </a>
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                )}

                {/* 상태 메시지 */}
                <div
                  className={`rounded-lg p-4 ${
                    apiData.success
                      ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
                      : "bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800"
                  }`}
                >
                  <div
                    className={`font-semibold mb-2 ${
                      apiData.success
                        ? "text-green-800 dark:text-green-200"
                        : "text-yellow-800 dark:text-yellow-200"
                    }`}
                  >
                    {apiData.success ? "✅ 성공" : "⚠️ 부분 성공"}
                  </div>
                  <p
                    className={`${
                      apiData.success
                        ? "text-green-700 dark:text-green-300"
                        : "text-yellow-700 dark:text-yellow-300"
                    }`}
                  >
                    {apiData.message}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  // 특별한 환경변수로 접근 제어 (더 안전)
  const isDevMode = process.env.GEMINI_USAGE_PAGE === "true";

  if (!isDevMode) {
    return {
      notFound: true, // 404 페이지로 리다이렉트
    };
  }

  try {
    // 서버 사이드에서 데이터 가져오기
    const data = await getGeminiUsageData();
    return {
      props: {
        initialData: data,
      },
    };
  } catch (error: any) {
    console.error("서버 사이드 데이터 가져오기 실패:", error);
    return {
      props: {
        initialData: null,
        error: error.message || "데이터를 가져오는데 실패했습니다.",
      },
    };
  }
};
