import { getGeminiUsageData } from "@/features/dashboard/api/gemini-usage";
import {
  getMonthlyBillingData,
  getTokenUsage,
} from "@/features/dashboard/api/google-cloud";

jest.mock("@/features/dashboard/api/google-cloud", () => ({
  getTokenUsage: jest.fn(),
  getMonthlyBillingData: jest.fn(),
}));

const mockedGetTokenUsage = getTokenUsage as jest.MockedFunction<
  typeof getTokenUsage
>;
const mockedGetMonthlyBillingData =
  getMonthlyBillingData as jest.MockedFunction<typeof getMonthlyBillingData>;

const ENV_KEYS = [
  "GEMINI_API_KEY",
  "GOOGLE_CLOUD_PROJECT_ID",
  "GOOGLE_CLOUD_BILLING_ACCOUNT",
  "GOOGLE_APPLICATION_CREDENTIALS",
] as const;

const originalEnv: Partial<Record<(typeof ENV_KEYS)[number], string>> = {};

const tokenUsage = {
  promptTokens: 1000,
  candidatesTokenCount: 2000,
  totalTokenCount: 3000,
  headers: {
    quotaUser: "user-1",
    quotaRemaining: "9",
    quotaLimit: "10",
  },
  hasUsageMetadata: true,
  responseKeys: ["usageMetadata"],
};

const billingData = {
  projectId: "proj-1",
  billingAccountId: "billing-1",
  currentMonthCost: 1.5,
  startDate: "2024-06-01T00:00:00.000Z",
  endDate: "2024-06-30T00:00:00.000Z",
  services: [
    { service: "Generative Language API", cost: "1.5", currency: "USD" },
  ],
  apiVersion: "Google Cloud Billing API v1",
  dataSource: "Google Cloud Cost Management",
  lastUpdated: "2024-06-15T00:00:00.000Z",
};

describe("getGeminiUsageData", () => {
  beforeEach(() => {
    jest.spyOn(console, "info").mockImplementation(() => undefined);
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    for (const key of ENV_KEYS) {
      originalEnv[key] = process.env[key];
      delete process.env[key];
    }
    mockedGetTokenUsage.mockReset();
    mockedGetMonthlyBillingData.mockReset();
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (originalEnv[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = originalEnv[key];
      }
    }
    jest.restoreAllMocks();
  });

  it("API 키가 없으면 에러를 던진다", async () => {
    process.env.GOOGLE_CLOUD_PROJECT_ID = "proj-1";

    await expect(getGeminiUsageData()).rejects.toThrow(
      "Gemini API 키가 설정되지 않았습니다.",
    );
    expect(mockedGetTokenUsage).not.toHaveBeenCalled();
  });

  it("프로젝트 ID가 없으면 에러를 던진다", async () => {
    process.env.GEMINI_API_KEY = "1234567890abcdef";

    await expect(getGeminiUsageData()).rejects.toThrow(
      "Google Cloud Project ID가 설정되지 않았습니다.",
    );
  });

  it("결제 데이터를 받으면 실제 비용과 성공 메시지를 반환한다", async () => {
    process.env.GEMINI_API_KEY = "1234567890abcdef";
    process.env.GOOGLE_CLOUD_PROJECT_ID = "proj-1";
    process.env.GOOGLE_CLOUD_BILLING_ACCOUNT = "billing-1";
    process.env.GOOGLE_APPLICATION_CREDENTIALS = "creds";
    mockedGetTokenUsage.mockResolvedValue(tokenUsage);
    mockedGetMonthlyBillingData.mockResolvedValue(billingData);

    const result = await getGeminiUsageData();

    expect(mockedGetMonthlyBillingData).toHaveBeenCalledWith(
      "proj-1",
      "billing-1",
    );
    expect(result.success).toBe(true);
    expect(result.message).toBe(
      "Generative Language API 실제 데이터를 성공적으로 가져왔습니다.",
    );
    expect(result.usage).toEqual({
      model: "gemini-1.5-flash",
      promptTokens: 1000,
      candidatesTokenCount: 2000,
      totalTokenCount: 3000,
      headers: {
        quotaUser: "user-1",
        quotaRemaining: "9",
        quotaLimit: "10",
      },
      responseHeaders: {
        "x-quota-user": "user-1",
        "x-quota-remaining": "9",
        "x-quota-limit": "10",
      },
    });
    expect(result.billing.currentMonthCost).toBe(1.5);
    expect(result.billing.currentMonthUsage).toBe(20000000);
    expect(result.billing.budgetLimit).toBe(50);
    expect(result.billing.remainingBudget).toBe(48.5);
    expect(result.billing.currency).toBe("USD");
    expect(result.billing.projectId).toBe("proj-1");
    expect(result.usageCost).toEqual({
      model: "gemini-1.5-flash",
      inputTokensCost: 0,
      outputTokensCost: 0,
      totalCost: 1.5,
      currency: "USD",
    });
    expect(result.apiStatus).toEqual({
      hasApiKey: true,
      apiKeyLength: 16,
      apiKeyPrefix: "1234567890...",
      hasGoogleCloudCredentials: true,
      hasProjectId: true,
      hasBillingAccount: true,
    });
    expect(result.billingData).toEqual({
      currentMonthCost: 1.5,
      services: billingData.services,
      billingPeriod: {
        start: "2024-06-01T00:00:00.000Z",
        end: "2024-06-30T00:00:00.000Z",
      },
      source: "Google Cloud Billing API (실제 데이터)",
    });
    expect(result.dataSources).toEqual({
      tokenUsage: "실제 Gemini API",
      performanceMetrics: "예상 데이터",
      billingData: "실제 Google Cloud Billing",
    });
    expect(result.integrationNote.description).toBe(
      "Google Cloud Billing API에서 실제 비용 정보를 가져왔습니다.",
    );
  });

  it("결제 계정이 없으면 토큰으로 비용을 계산하고 결제 조회는 호출하지 않는다", async () => {
    process.env.GEMINI_API_KEY = "1234567890abcdef";
    process.env.GOOGLE_CLOUD_PROJECT_ID = "proj-1";
    mockedGetTokenUsage.mockResolvedValue(tokenUsage);

    const result = await getGeminiUsageData();

    expect(mockedGetMonthlyBillingData).not.toHaveBeenCalled();
    expect(result.usageCost.inputTokensCost).toBe(0.000075);
    expect(result.usageCost.outputTokensCost).toBe(0.0006);
    expect(result.usageCost.totalCost).toBe(0.000675);
    expect(result.billing.currentMonthUsage).toBe(3000);
    expect(result.billing.remainingBudget).toBe(49.999325);
    expect(result.billingData).toBeUndefined();
    expect(result.message).toBe(
      "Generative Language API 실제 데이터를 성공적으로 가져왔습니다.",
    );
    expect(result.dataSources?.billingData).toBe("실제 Google Cloud Billing");
    expect(result.apiStatus.hasBillingAccount).toBe(false);
    expect(result.apiStatus.hasGoogleCloudCredentials).toBe(false);
  });

  it("토큰 조회가 실패하면 usage를 null로 반환한다", async () => {
    process.env.GEMINI_API_KEY = "1234567890abcdef";
    process.env.GOOGLE_CLOUD_PROJECT_ID = "proj-1";
    process.env.GOOGLE_CLOUD_BILLING_ACCOUNT = "billing-1";
    mockedGetTokenUsage.mockRejectedValue(new Error("token down"));
    mockedGetMonthlyBillingData.mockResolvedValue(billingData);

    const result = await getGeminiUsageData();

    expect(result.usage).toBeNull();
    expect(result.billing.currentMonthCost).toBe(1.5);
    expect(result.dataSources?.tokenUsage).toBe("예상 데이터");
    expect(result.dataSources?.billingData).toBe("실제 Google Cloud Billing");
  });

  it("토큰과 결제가 모두 실패하면 예상 비용 메시지를 반환한다", async () => {
    process.env.GEMINI_API_KEY = "1234567890abcdef";
    process.env.GOOGLE_CLOUD_PROJECT_ID = "proj-1";
    process.env.GOOGLE_CLOUD_BILLING_ACCOUNT = "billing-1";
    mockedGetTokenUsage.mockRejectedValue(new Error("token down"));
    mockedGetMonthlyBillingData.mockRejectedValue(new Error("billing down"));

    const result = await getGeminiUsageData();

    expect(result.success).toBe(true);
    expect(result.usage).toBeNull();
    expect(result.message).toBe(
      "토큰 사용량 기반으로 예상 비용을 계산했습니다.",
    );
    expect(result.billing.currentMonthCost).toBe(0);
    expect(result.billing.currentMonthUsage).toBe(0);
    expect(result.billing.remainingBudget).toBe(50);
    expect(result.billingData).toBeUndefined();
    expect(result.dataSources).toEqual({
      tokenUsage: "예상 데이터",
      performanceMetrics: "예상 데이터",
      billingData: "예상 데이터",
    });
    expect(result.integrationNote.description).toBe(
      "현재는 예상 비용을 표시합니다. 실제 비용 정보를 보려면 Google Cloud Billing API를 연동해야 합니다.",
    );
    expect(result.pricing.inputTokensPer1K).toBe(0.000075);
    expect(result.pricing.outputTokensPer1K).toBe(0.0003);
    expect(result.costCheckMethods?.[0]?.name).toBe("Google Cloud Console");
    expect(result.usageCheckMethods?.[0]?.name).toBe("Gemini API");
  });
});
