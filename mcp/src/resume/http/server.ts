import { createPortfolioAdminApi } from "@mcp/auth/adminApi";
import { createPortfolioAdminOAuth } from "@mcp/auth/adminOAuth";
import { fetchOpenRouterModelText } from "@mcp/resume/connection/openRouterModelConnection";
import {
  fetchResumeModel,
  ResumeConnectionError,
  type ResumeConnectionFetch,
} from "@mcp/resume/connection/resumeConnection";
import { fetchResumeModelText } from "@mcp/resume/connection/resumeModelConnection";
import { fetchActiveResumeModelSetting } from "@mcp/resume/connection/resumeModelSetting";
import { accessSecret } from "@mcp/resume/connection/secretManager";
import { withSessionCache } from "@mcp/resume/http/cachedSessionIntrospector";
import {
  createResumeMcpServer,
  type ResumeModelSource,
} from "@mcp/resume/http/createResumeMcpServer";
import {
  createPortfolioApiIntrospector,
  createPortfolioApiSessionIntrospector,
} from "@mcp/resume/http/portfolioApiIntrospector";
import type { ResumeModelClient } from "@mcp/resume/output/runResumeHarness";

const resumeModelConnections = {
  openrouter: fetchOpenRouterModelText,
} as const;

export type ResumeModelEnv = {
  RESUME_MODEL_URL?: string;
  RESUME_MODEL_TOKEN?: string;
  RESUME_MODEL_PROVIDER?: string;
  RESUME_MODEL_NAME?: string;
};

export const resumeModelFromEnv = (
  env: ResumeModelEnv,
  fetchImpl?: ResumeConnectionFetch,
): ResumeModelClient => ({
  generate: (input) => {
    const url = env.RESUME_MODEL_URL ?? "";
    const token = env.RESUME_MODEL_TOKEN ?? "";
    const provider = env.RESUME_MODEL_PROVIDER?.trim() ?? "";
    if (provider === "") {
      return fetchResumeModelText(input, { url, token, fetchImpl });
    }
    const connect =
      resumeModelConnections[provider as keyof typeof resumeModelConnections];
    if (!connect) {
      return Promise.reject(
        new ResumeConnectionError("MISSING_MODEL_CONNECTION"),
      );
    }
    return connect(input, {
      url,
      token,
      fetchImpl,
      model: env.RESUME_MODEL_NAME?.trim() ?? "",
    });
  },
});

export type ResumeModelSettingSource = {
  settingUrl: string;
  settingToken: string;
  environment: string;
  fetchImpl?: ResumeConnectionFetch;
};

// 요청마다 새로 만든다. 첫 generate에서 설정을 한 번만 읽어 그 요청의 모든 모델 호출이 같은 스냅샷을 쓴다
export const resumeModelFromSetting = (
  source: ResumeModelSettingSource,
): ResumeModelClient => {
  const resolve = async () => {
    const setting = await fetchActiveResumeModelSetting({
      url: source.settingUrl,
      token: source.settingToken,
      environment: source.environment,
      fetchImpl: source.fetchImpl,
    });
    const connect =
      resumeModelConnections[
        setting.provider as keyof typeof resumeModelConnections
      ];
    if (!connect) throw new ResumeConnectionError("MISSING_MODEL_CONNECTION");
    const token = await accessSecret(setting.secretRef, {
      fetchImpl: source.fetchImpl,
    });

    return { setting, connect, token };
  };
  let resolved: ReturnType<typeof resolve> | undefined;

  return {
    generate: async (input) => {
      resolved ??= resolve();
      const { setting, connect, token } = await resolved;

      return connect(input, {
        url: setting.url,
        token,
        fetchImpl: source.fetchImpl,
        model: setting.modelName,
      });
    },
  };
};

export type ResumeModelProcessEnv = ResumeModelEnv & {
  RESUME_MODEL_SETTING_URL?: string;
  RESUME_MODEL_SETTING_TOKEN?: string;
  RESUME_MODEL_ENVIRONMENT?: string;
};

export const resumeModelSourceFromEnv = (
  env: ResumeModelProcessEnv,
  fetchImpl?: ResumeConnectionFetch,
): ResumeModelSource => {
  const settingUrl = env.RESUME_MODEL_SETTING_URL?.trim() ?? "";
  // 이행 기간에만 기존 환경변수 모드를 유지한다. 동적 모드로 들어오면 환경변수로 대체하지 않는다
  if (settingUrl === "") return resumeModelFromEnv(env, fetchImpl);

  // 요청마다 실패하는 서버가 뜨지 않도록 부트스트랩 값은 시작 단계에서 확인한다
  const settingToken = env.RESUME_MODEL_SETTING_TOKEN?.trim() ?? "";
  const environment = env.RESUME_MODEL_ENVIRONMENT?.trim() ?? "";
  if (!settingUrl.startsWith("https://")) {
    throw new Error("RESUME_MODEL_SETTING_URL must be an https URL");
  }
  if (settingToken === "") {
    throw new Error(
      "RESUME_MODEL_SETTING_TOKEN is required when RESUME_MODEL_SETTING_URL is set",
    );
  }
  if (!["development", "production"].includes(environment)) {
    throw new Error(
      "RESUME_MODEL_ENVIRONMENT must be development or production",
    );
  }

  return () =>
    resumeModelFromSetting({
      settingUrl,
      settingToken,
      environment,
      fetchImpl,
    });
};

export const startResumeMcpServer = () => {
  const resumeUrl = process.env.RESUME_CONNECTION_URL ?? "";
  const resumeToken = process.env.RESUME_CONNECTION_TOKEN ?? "";

  if (resumeUrl === "" || resumeToken === "") {
    throw new Error(
      "RESUME_CONNECTION_URL and RESUME_CONNECTION_TOKEN are required",
    );
  }

  const portfolioApiUrl = (process.env.PORTFOLIO_API_URL ?? "").replace(
    /\/+$/,
    "",
  );
  const publicUrl = process.env.MCP_PUBLIC_URL ?? "";
  if (!publicUrl) throw new Error("MCP_PUBLIC_URL is required");
  const authorizationServer =
    process.env.PORTFOLIO_API_AUTH_ISSUER?.trim() || `${portfolioApiUrl}/auth`;
  new URL(publicUrl);
  new URL(authorizationServer);
  const introspectOptions = {
    apiUrl: portfolioApiUrl,
    serviceToken: process.env.MCP_AUTH_SERVICE_TOKEN ?? "",
  };
  const introspect = createPortfolioApiIntrospector(introspectOptions);
  // 관리 화면은 활성 결과만 30초 캐시한다. /mcp 도구 요청은 폐기를 즉시 반영하도록 캐시하지 않는다
  const introspectSession = withSessionCache(
    createPortfolioApiSessionIntrospector(introspectOptions),
    { ttlMs: 30_000 },
  );

  const port = Number(process.env.PORT ?? 8080);

  return createResumeMcpServer({
    introspect,
    log: (message) => console.log(message),
    protectedResourceMetadata: {
      resource: publicUrl,
      authorization_servers: [authorizationServer],
      scopes_supported: ["resume:use"],
      bearer_methods_supported: ["header"],
    },
    connection: {
      load: (input) =>
        fetchResumeModel(input, { url: resumeUrl, token: resumeToken }),
    },
    admin: {
      api: createPortfolioAdminApi({
        baseUrl: portfolioApiUrl,
        serviceToken: process.env.MCP_AUTH_SERVICE_TOKEN ?? "",
      }),
      introspect: introspectSession,
      oauth: createPortfolioAdminOAuth({ issuer: authorizationServer }),
      publicUrl,
      oauthResource:
        process.env.MCP_ADMIN_OAUTH_RESOURCE_URL?.trim() || publicUrl,
      authorizationOrigin: new URL(authorizationServer).origin,
    },
    model: resumeModelSourceFromEnv({
      RESUME_MODEL_URL: process.env.RESUME_MODEL_URL,
      RESUME_MODEL_TOKEN: process.env.RESUME_MODEL_TOKEN,
      RESUME_MODEL_PROVIDER: process.env.RESUME_MODEL_PROVIDER,
      RESUME_MODEL_NAME: process.env.RESUME_MODEL_NAME,
      RESUME_MODEL_SETTING_URL: process.env.RESUME_MODEL_SETTING_URL,
      RESUME_MODEL_SETTING_TOKEN: process.env.RESUME_MODEL_SETTING_TOKEN,
      RESUME_MODEL_ENVIRONMENT: process.env.RESUME_MODEL_ENVIRONMENT,
    }),
  }).listen(port);
};

const entry = process.argv[1] ?? "";
if (entry.endsWith("server.ts") || entry.endsWith("server.js")) {
  startResumeMcpServer();
}
