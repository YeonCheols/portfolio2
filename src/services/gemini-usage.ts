import { getMonthlyBillingData, getTokenUsage } from "@/services/google-cloud";

interface BillingInfo {
  projectId: string;
  currentMonthCost: number;
  currentMonthUsage: number;
  budgetLimit: number;
  remainingBudget: number;
  currency: string;
  lastUpdated: string;
}

interface GeminiUsageCost {
  model: string;
  inputTokensCost: number;
  outputTokensCost: number;
  totalCost: number;
  currency: string;
}

interface PricingInfo {
  model: string;
  inputTokensPer1K: number;
  outputTokensPer1K: number;
  currency: string;
  source: string;
  apiName: string;
  endpoint: string;
}

interface IntegrationNote {
  title: string;
  description: string;
  requirements: string[];
  links: Array<{
    name: string;
    url: string;
  }>;
}

export interface UnifiedApiResponse {
  success: boolean;
  message: string;
  usage: {
    model: string;
    promptTokens: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
    headers: {
      quotaUser?: string | null;
      quotaRemaining?: string | null;
      quotaLimit?: string | null;
    };
    responseHeaders: {
      "x-quota-user"?: string | null;
      "x-quota-remaining"?: string | null;
      "x-quota-limit"?: string | null;
      "x-ratelimit-remaining"?: string | null;
      "x-ratelimit-limit"?: string | null;
    };
  } | null;
  model: {
    name: string;
    version: string;
    description: string;
  };
  apiStatus: {
    hasApiKey: boolean;
    apiKeyLength: number;
    apiKeyPrefix: string;
    hasGoogleCloudCredentials?: boolean;
    hasProjectId?: boolean;
    hasBillingAccount?: boolean;
  };
  billing: BillingInfo;
  usageCost: GeminiUsageCost;
  pricing: PricingInfo;
  integrationNote: IntegrationNote;
  performanceMetrics?: {
    totalRequests: number;
    errorRate: number;
    medianLatency: number;
    latency95th: number;
    dataPoints?: number;
    timeRange?: {
      start: string;
      end: string;
    };
    source: string;
  };
  billingData?: {
    currentMonthCost: number;
    services?: Array<{
      service: string;
      cost: string;
      currency: string;
    }>;
    billingPeriod?: {
      start: string;
      end: string;
    };
    source: string;
  };
  dataSources?: {
    tokenUsage: string;
    performanceMetrics: string;
    billingData: string;
  };
  costCheckMethods?: Array<{
    name: string;
    url: string;
    description: string;
  }>;
  usageCheckMethods?: Array<{
    name: string;
    url: string;
    description: string;
  }>;
}

export async function getGeminiUsageData(): Promise<UnifiedApiResponse> {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  const GOOGLE_CLOUD_PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT_ID;
  const GOOGLE_CLOUD_BILLING_ACCOUNT = process.env.GOOGLE_CLOUD_BILLING_ACCOUNT;
  const GOOGLE_APPLICATION_CREDENTIALS =
    process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (!GEMINI_API_KEY) {
    throw new Error("Gemini API 키가 설정되지 않았습니다.");
  }

  if (!GOOGLE_CLOUD_PROJECT_ID) {
    throw new Error("Google Cloud Project ID가 설정되지 않았습니다.");
  }

  try {
    // 통합된 데이터 가져오기 - 중복 호출 제거
    const [tokenUsage, billingData] = await Promise.allSettled([
      getTokenUsage(),
      GOOGLE_CLOUD_BILLING_ACCOUNT
        ? getMonthlyBillingData(
            GOOGLE_CLOUD_PROJECT_ID,
            GOOGLE_CLOUD_BILLING_ACCOUNT,
          )
        : Promise.resolve(null),
    ]);

    console.info("통합 API - tokenUsage:", tokenUsage.status);
    console.info("통합 API - billingData:", billingData.status);

    // 토큰 사용량 정보
    const usageInfo =
      tokenUsage.status === "fulfilled"
        ? {
            model: "gemini-1.5-flash",
            promptTokens: tokenUsage.value.promptTokens,
            candidatesTokenCount: tokenUsage.value.candidatesTokenCount,
            totalTokenCount: tokenUsage.value.totalTokenCount,
            headers: {
              quotaUser: tokenUsage.value.headers.quotaUser || null,
              quotaRemaining: tokenUsage.value.headers.quotaRemaining || null,
              quotaLimit: tokenUsage.value.headers.quotaLimit || null,
            },
            responseHeaders: {
              "x-quota-user": tokenUsage.value.headers.quotaUser || null,
              "x-quota-remaining":
                tokenUsage.value.headers.quotaRemaining || null,
              "x-quota-limit": tokenUsage.value.headers.quotaLimit || null,
            },
          }
        : null;

    // 비용 계산
    let estimatedCost = 0;
    let totalTokens = 0;
    let inputTokensCost = 0;
    let outputTokensCost = 0;

    // 실제 비용 데이터 사용
    if (billingData.status === "fulfilled" && billingData.value) {
      estimatedCost = billingData.value.currentMonthCost;
      totalTokens = Math.round((estimatedCost / 0.000075) * 1000);
    } else {
      // 토큰 사용량 기반으로 계산
      if (tokenUsage.status === "fulfilled") {
        totalTokens = tokenUsage.value.totalTokenCount;
        const inputTokens = tokenUsage.value.promptTokens;
        const outputTokens = tokenUsage.value.candidatesTokenCount;

        inputTokensCost =
          Math.round((inputTokens / 1000) * 0.000075 * 100000000) / 100000000;
        outputTokensCost =
          Math.round((outputTokens / 1000) * 0.0003 * 100000000) / 100000000;
        estimatedCost =
          Math.round((inputTokensCost + outputTokensCost) * 100000000) /
          100000000;
      }
    }

    // 비용 정보 구성
    const billingInfo: BillingInfo = {
      projectId: GOOGLE_CLOUD_PROJECT_ID,
      currentMonthCost: estimatedCost,
      currentMonthUsage: totalTokens,
      budgetLimit: 50,
      remainingBudget: Math.round((50 - estimatedCost) * 100000000) / 100000000,
      currency: "USD",
      lastUpdated: new Date().toISOString(),
    };

    const geminiUsageCost: GeminiUsageCost = {
      model: "gemini-1.5-flash",
      inputTokensCost: inputTokensCost,
      outputTokensCost: outputTokensCost,
      totalCost: estimatedCost,
      currency: "USD",
    };

    // 비용 정보
    const costInfo =
      billingData.status === "fulfilled" && billingData.value
        ? {
            currentMonthCost: billingData.value.currentMonthCost,
            services: billingData.value.services,
            billingPeriod: {
              start: billingData.value.startDate,
              end: billingData.value.endDate,
            },
            source: "Google Cloud Billing API (실제 데이터)",
          }
        : undefined;

    const response: UnifiedApiResponse = {
      success: true,
      message:
        billingData.status === "fulfilled"
          ? "Generative Language API 실제 데이터를 성공적으로 가져왔습니다."
          : "토큰 사용량 기반으로 예상 비용을 계산했습니다.",
      usage: usageInfo,
      model: {
        name: "gemini-1.5-flash",
        version: "v1beta",
        description: "Gemini 1.5 Flash 모델 - 빠른 응답과 효율적인 토큰 사용",
      },
      apiStatus: {
        hasApiKey: !!GEMINI_API_KEY,
        apiKeyLength: GEMINI_API_KEY?.length || 0,
        apiKeyPrefix: GEMINI_API_KEY?.substring(0, 10) + "...",
        hasGoogleCloudCredentials: !!GOOGLE_APPLICATION_CREDENTIALS,
        hasProjectId: !!GOOGLE_CLOUD_PROJECT_ID,
        hasBillingAccount: !!GOOGLE_CLOUD_BILLING_ACCOUNT,
      },
      billing: billingInfo,
      usageCost: geminiUsageCost,
      pricing: {
        model: "gemini-1.5-flash",
        inputTokensPer1K: 0.000075,
        outputTokensPer1K: 0.0003,
        currency: "USD",
        source: "Google Cloud Generative Language API Pricing (2024)",
        apiName: "Generative Language API",
        endpoint: "generativelanguage.googleapis.com",
      },
      integrationNote: {
        title: "실제 Google Cloud Billing API 연동",
        description:
          billingData.status === "fulfilled"
            ? "Google Cloud Billing API에서 실제 비용 정보를 가져왔습니다."
            : "현재는 예상 비용을 표시합니다. 실제 비용 정보를 보려면 Google Cloud Billing API를 연동해야 합니다.",
        requirements: [
          "Google Cloud Project 설정",
          "Billing API 활성화",
          "서비스 계정 키 설정",
          "적절한 권한 부여",
        ],
        links: [
          {
            name: "Google Cloud Console",
            url: "https://console.cloud.google.com/",
          },
          {
            name: "Billing API 문서",
            url: "https://cloud.google.com/billing/docs/reference/rest",
          },
        ],
      },
      billingData: costInfo,
      dataSources: {
        tokenUsage:
          tokenUsage.status === "fulfilled" ? "실제 Gemini API" : "예상 데이터",
        performanceMetrics: "예상 데이터",
        billingData:
          billingData.status === "fulfilled"
            ? "실제 Google Cloud Billing"
            : "예상 데이터",
      },
      costCheckMethods: [
        {
          name: "Google Cloud Console",
          url: "https://console.cloud.google.com/billing",
          description: "Google Cloud Console에서 실시간 비용 확인",
        },
        {
          name: "Billing API",
          url: "https://cloud.google.com/billing/docs/reference/rest",
          description: "Billing API를 통한 프로그래밍 방식 비용 확인",
        },
      ],
      usageCheckMethods: [
        {
          name: "Gemini API",
          url: "https://aistudio.google.com/app/apikey",
          description: "Google AI Studio에서 API 키 및 사용량 확인",
        },
        {
          name: "Google Cloud Console",
          url: "https://console.cloud.google.com/apis/credentials",
          description: "Google Cloud Console에서 API 사용량 확인",
        },
      ],
    };

    return response;
  } catch (error) {
    console.error("Gemini 사용량 데이터 가져오기 실패:", error);
    throw error;
  }
}
