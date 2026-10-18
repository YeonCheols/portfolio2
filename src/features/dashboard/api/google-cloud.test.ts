import axios from "axios";
import { google } from "googleapis";

import {
  getBillingClient,
  getMonthlyBillingData,
  getPerformanceMetrics,
  getTokenUsage,
} from "@/features/dashboard/api/google-cloud";

jest.mock("axios");
jest.mock("googleapis", () => ({
  google: {
    auth: {
      GoogleAuth: jest.fn(),
    },
    cloudbilling: jest.fn(),
  },
}));

const mockedPost = axios.post as jest.MockedFunction<typeof axios.post>;
const billingAccountsList = jest.fn();
const projectsList = jest.fn();

const ENV_KEYS = ["GOOGLE_APPLICATION_CREDENTIALS", "GEMINI_API_KEY"] as const;
const originalEnv: Partial<Record<(typeof ENV_KEYS)[number], string>> = {};

const pem = "-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----\\n";

const credentials = (overrides: Record<string, unknown> = {}) =>
  JSON.stringify({
    type: "service_account",
    client_email: "bot@example.com",
    private_key: pem,
    ...overrides,
  });

describe("google-cloud", () => {
  beforeEach(() => {
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    jest.spyOn(console, "info").mockImplementation(() => undefined);
    jest.spyOn(console, "warn").mockImplementation(() => undefined);
    for (const key of ENV_KEYS) {
      originalEnv[key] = process.env[key];
      delete process.env[key];
    }
    billingAccountsList.mockReset();
    projectsList.mockReset();
    mockedPost.mockReset();
    (google.auth.GoogleAuth as unknown as jest.Mock).mockReset();
    (google.cloudbilling as unknown as jest.Mock).mockReset();
    (google.cloudbilling as unknown as jest.Mock).mockImplementation(() => ({
      billingAccounts: {
        list: billingAccountsList,
        projects: { list: projectsList },
      },
    }));
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

  it("자격 증명이 없으면 결제 클라이언트 생성을 거절한다", () => {
    expect(() => getBillingClient()).toThrow(
      "GOOGLE_APPLICATION_CREDENTIALS 환경 변수가 설정되지 않았습니다.",
    );
  });

  it("올바른 서비스 계정이면 결제 범위로 인증 클라이언트를 만든다", () => {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = credentials();

    getBillingClient();

    expect(google.cloudbilling).toHaveBeenCalledWith("v1");
    expect(google.auth.GoogleAuth).toHaveBeenCalledWith({
      credentials: expect.objectContaining({
        type: "service_account",
        client_email: "bot@example.com",
        private_key:
          "-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----\n",
      }),
      scopes: [
        "https://www.googleapis.com/auth/cloud-billing",
        "https://www.googleapis.com/auth/cloud-billing.readonly",
        "https://www.googleapis.com/auth/monitoring",
        "https://www.googleapis.com/auth/monitoring.read",
      ],
    });
  });

  it("자격 증명이 JSON이 아니면 파싱 실패를 던진다", async () => {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = "not-json";

    await expect(getMonthlyBillingData("proj-1", "acc-1")).rejects.toThrow(
      "서비스 계정 키 파싱 실패: GOOGLE_APPLICATION_CREDENTIALS가 올바른 JSON 형식이 아닙니다.",
    );
  });

  it("client_email이 없으면 파싱 실패를 던진다", async () => {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = credentials({
      client_email: "",
    });

    await expect(getMonthlyBillingData("proj-1", "acc-1")).rejects.toThrow(
      "서비스 계정 키 파싱 실패: 서비스 계정 키에 client_email 필드가 없습니다.",
    );
  });

  it("private_key가 없으면 파싱 실패를 던진다", async () => {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = credentials({
      private_key: "",
    });

    await expect(getMonthlyBillingData("proj-1", "acc-1")).rejects.toThrow(
      "서비스 계정 키 파싱 실패: 서비스 계정 키에 private_key 필드가 없습니다.",
    );
  });

  it("type이 service_account가 아니면 파싱 실패를 던진다", async () => {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = credentials({
      type: "user",
    });

    await expect(getMonthlyBillingData("proj-1", "acc-1")).rejects.toThrow(
      "서비스 계정 키 파싱 실패: 서비스 계정 키의 type이 올바르지 않습니다.",
    );
  });

  it("private_key가 PEM이 아니면 파싱 실패를 던진다", async () => {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = credentials({
      private_key: "not-a-pem",
    });

    await expect(getMonthlyBillingData("proj-1", "acc-1")).rejects.toThrow(
      "서비스 계정 키 파싱 실패: private_key 형식이 올바르지 않습니다. PEM 형식이어야 합니다.",
    );
  });

  it("인증 객체가 에러가 아닌 값으로 실패하면 일반 파싱 실패를 던진다", async () => {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = credentials();
    (google.auth.GoogleAuth as unknown as jest.Mock).mockImplementationOnce(
      () => {
        throw "bad";
      },
    );

    await expect(getMonthlyBillingData("proj-1", "acc-1")).rejects.toThrow(
      "서비스 계정 키 파싱에 실패했습니다.",
    );
  });

  it("결제 계정을 찾지 못하면 에러를 던진다", async () => {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = credentials();
    billingAccountsList.mockResolvedValue({ data: { billingAccounts: [] } });

    await expect(getMonthlyBillingData("proj-1", "acc-1")).rejects.toThrow(
      "Billing Account를 찾을 수 없습니다.",
    );
  });

  it("프로젝트가 일치하고 비용 정보가 있으면 추정 비용을 반환한다", async () => {
    jest.spyOn(Math, "random").mockReturnValue(0.5);
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2024-06-15T03:00:00.000Z"));
    process.env.GOOGLE_APPLICATION_CREDENTIALS = credentials();
    billingAccountsList.mockResolvedValue({
      data: { billingAccounts: [{ name: "billingAccounts/acc-1" }] },
    });
    projectsList
      .mockResolvedValueOnce({
        data: { projectBillingInfo: [{ projectId: "proj-1" }] },
      })
      .mockResolvedValueOnce({
        data: { projectBillingInfo: [{ projectId: "proj-1" }] },
      });

    const result = await getMonthlyBillingData("proj-1", "acc-1");
    const now = new Date();

    expect(result.currentMonthCost).toBe(0.005);
    expect(result.projectId).toBe("proj-1");
    expect(result.billingAccountId).toBe("acc-1");
    expect(result.services).toEqual([
      {
        service: "Generative Language API",
        cost: "0.005",
        currency: "USD",
        source: "Google Cloud Billing API v1",
        projectId: "proj-1",
        billingAccount: "billingAccounts/acc-1",
      },
    ]);
    expect(result.apiVersion).toBe("Google Cloud Billing API v1");
    expect(result.dataSource).toBe("Google Cloud Cost Management");
    expect(result.startDate).toBe(
      new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
    );
    expect(result.endDate).toBe(
      new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString(),
    );
    expect(result.lastUpdated).toBe("2024-06-15T03:00:00.000Z");
    expect(projectsList).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ name: "projects/proj-1" }),
    );
    jest.useRealTimers();
  });

  it("비용 응답에 프로젝트 정보가 없으면 기본 비용을 반환한다", async () => {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = credentials();
    billingAccountsList.mockResolvedValue({
      data: { billingAccounts: [{ name: "billingAccounts/acc-1" }] },
    });
    projectsList
      .mockResolvedValueOnce({
        data: { projectBillingInfo: [{ projectId: "proj-1" }] },
      })
      .mockResolvedValueOnce({ data: {} });

    const result = await getMonthlyBillingData("proj-1", "acc-1");

    expect(result.currentMonthCost).toBe(0.001);
    expect(result.services[0]).toEqual(
      expect.objectContaining({
        cost: "0.001",
        source: "Estimated",
        projectId: "proj-1",
      }),
    );
  });

  it("비용 API가 실패하면 대체 비용을 반환한다", async () => {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = credentials();
    billingAccountsList.mockResolvedValue({
      data: { billingAccounts: [{ name: "billingAccounts/acc-1" }] },
    });
    projectsList
      .mockResolvedValueOnce({
        data: { projectBillingInfo: [{ projectId: "proj-1" }] },
      })
      .mockRejectedValueOnce(new Error("cost down"));

    const result = await getMonthlyBillingData("proj-1", "acc-1");

    expect(result.currentMonthCost).toBe(0.001);
    expect(result.services[0]).toEqual(
      expect.objectContaining({
        cost: "0.001",
        source: "Fallback",
        error: "cost down",
      }),
    );
  });

  it("프로젝트 ID가 일치하지 않으면 비용 0을 반환한다", async () => {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = credentials();
    billingAccountsList.mockResolvedValue({
      data: { billingAccounts: [{ name: "billingAccounts/acc-1" }] },
    });
    projectsList.mockResolvedValue({
      data: { projectBillingInfo: [{ projectId: "other" }] },
    });

    const result = await getMonthlyBillingData("proj-1", "acc-1");

    expect(result.currentMonthCost).toBe(0);
    expect(result.services).toEqual([]);
  });

  it("성능 지표는 24시간 범위의 수치를 반환한다", async () => {
    jest.spyOn(Math, "random").mockReturnValue(0);

    const result = await getPerformanceMetrics("proj-1");
    const start = new Date(result.timeRange.start).getTime();
    const end = new Date(result.timeRange.end).getTime();

    expect(result).toEqual(
      expect.objectContaining({
        totalRequests: 100,
        errorRate: 0,
        medianLatency: 50,
        latency95th: 100,
        dataPoints: 1,
      }),
    );
    expect(end - start).toBe(24 * 60 * 60 * 1000);
  });

  it("토큰 사용량 응답이 있으면 헤더와 함께 반환한다", async () => {
    process.env.GEMINI_API_KEY = "test-gemini-key";
    mockedPost.mockResolvedValue({
      data: {
        usageMetadata: {
          promptTokenCount: 3,
          candidatesTokenCount: 4,
          totalTokenCount: 7,
        },
      },
      headers: {
        "x-quota-user": "me",
        "x-quota-remaining": "1",
        "x-quota-limit": "2",
      },
    });

    await expect(getTokenUsage()).resolves.toEqual({
      promptTokens: 3,
      candidatesTokenCount: 4,
      totalTokenCount: 7,
      headers: {
        quotaUser: "me",
        quotaRemaining: "1",
        quotaLimit: "2",
      },
      hasUsageMetadata: true,
      responseKeys: ["usageMetadata"],
    });
    expect(mockedPost).toHaveBeenCalledWith(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=test-gemini-key",
      expect.objectContaining({
        contents: [
          expect.objectContaining({
            role: "user",
            parts: [{ text: "Hello" }],
          }),
        ],
      }),
      expect.objectContaining({ timeout: 30000 }),
    );
  });

  it("usageMetadata가 없으면 토큰 수를 0으로 반환한다", async () => {
    process.env.GEMINI_API_KEY = "test-gemini-key";
    mockedPost.mockResolvedValue({ data: { candidates: [] }, headers: {} });

    await expect(getTokenUsage()).resolves.toEqual({
      promptTokens: 0,
      candidatesTokenCount: 0,
      totalTokenCount: 0,
      headers: {
        quotaUser: null,
        quotaRemaining: null,
        quotaLimit: null,
      },
      hasUsageMetadata: false,
      responseKeys: ["candidates"],
    });
  });

  it("총 토큰이 없으면 입력과 출력 토큰을 더한다", async () => {
    process.env.GEMINI_API_KEY = "test-gemini-key";
    mockedPost.mockResolvedValue({
      data: {
        usageMetadata: { promptTokenCount: 2, candidatesTokenCount: 5 },
      },
      headers: {},
    });

    const result = await getTokenUsage();

    expect(result.totalTokenCount).toBe(7);
  });

  it("토큰 조회가 실패하면 에러를 던진다", async () => {
    process.env.GEMINI_API_KEY = "test-gemini-key";
    mockedPost.mockRejectedValue(new Error("network"));

    await expect(getTokenUsage()).rejects.toThrow("network");
  });
});
