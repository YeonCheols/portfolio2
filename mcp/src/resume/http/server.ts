import { createPortfolioAdminApi } from "@mcp/auth/adminApi";
import { createSupabaseStorage } from "@mcp/storage/supabaseStorage";
import { createPortfolioAdminOAuth } from "@mcp/auth/adminOAuth";
import { createSettingConnectionTester } from "@mcp/auth/settingConnectionTest";
import {
  fetchGeminiModelResult,
  fetchGeminiModelText,
} from "@mcp/resume/connection/model/providers/geminiModelConnection";
import {
  fetchOpenAiModelResult,
  fetchOpenAiModelText,
} from "@mcp/resume/connection/model/providers/openAiModelConnection";
import {
  fetchOpenRouterModelResult,
  fetchOpenRouterModelText,
} from "@mcp/resume/connection/model/providers/openRouterModelConnection";
import { fetchActiveResumeModelSetting } from "@mcp/resume/connection/model/resumeModelSetting";
import { fetchResumeModel } from "@mcp/resume/connection/resume/resumeConnection";
import { withSessionCache } from "@mcp/resume/http/cachedSessionIntrospector";
import {
  createResumeMcpServer,
  type ResumeModelSource,
} from "@mcp/resume/http/createResumeMcpServer";
import { createPortfolioApiSessionIntrospector } from "@mcp/resume/http/portfolioApiIntrospector";
import {
  readMcpRuntimeConfig,
  readModelSettingConnection,
  type RuntimeEnv,
} from "@mcp/resume/http/runtimeConfig";
import type { ResumeModelClient } from "@mcp/resume/output/runResumeHarness";
import {
  ResumeConnectionError,
  type ResumeConnectionFetch,
} from "@mcp/resume/connection/shared/connection";

const resumeModelConnections = {
  openrouter: fetchOpenRouterModelText,
  openai: fetchOpenAiModelText,
  gemini: fetchGeminiModelText,
} as const;

// 연결 테스트는 공급자 응답 원문까지 보여줘야 해서 문장과 원문을 함께 돌려주는 연결을 쓴다
export const modelTestConnections = {
  openrouter: fetchOpenRouterModelResult,
  openai: fetchOpenAiModelResult,
  gemini: fetchGeminiModelResult,
} as const;

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
    if (!Object.hasOwn(resumeModelConnections, setting.provider)) {
      throw new ResumeConnectionError("MISSING_MODEL_CONNECTION");
    }
    const connect =
      resumeModelConnections[
        setting.provider as keyof typeof resumeModelConnections
      ];
    if (!connect) throw new ResumeConnectionError("MISSING_MODEL_CONNECTION");
    return { setting, connect };
  };
  let resolved: ReturnType<typeof resolve> | undefined;

  return {
    generate: async (input) => {
      resolved ??= resolve();
      const { setting, connect } = await resolved;

      return connect(input, {
        url: setting.url,
        token: setting.apiKey,
        fetchImpl: source.fetchImpl,
        model: setting.modelName,
      });
    },
  };
};

export const resumeModelSourceFromEnv = (
  env: RuntimeEnv,
  fetchImpl?: ResumeConnectionFetch,
): ResumeModelSource => {
  const connection = readModelSettingConnection(env);
  return () => resumeModelFromSetting({ ...connection, fetchImpl });
};

export const startResumeMcpServer = () => {
  const config = readMcpRuntimeConfig(process.env);
  const { publicUrl, authorizationServer, port } = config.server;
  const introspectOptions = config.api;
  const introspect = createPortfolioApiSessionIntrospector(introspectOptions);
  // 관리 화면은 활성 결과만 30초 캐시한다. /mcp 도구 요청은 폐기를 즉시 반영하도록 캐시하지 않는다
  const introspectSession = withSessionCache(
    createPortfolioApiSessionIntrospector(introspectOptions),
    { ttlMs: 30_000 },
  );

  const adminApi = createPortfolioAdminApi({
    baseUrl: config.api.apiUrl,
    serviceToken: config.api.serviceToken,
  });

  return createResumeMcpServer({
    introspect,
    environment: config.modelSetting.environment,
    storage: config.storage ? createSupabaseStorage(config.storage) : undefined,
    log: (message) => console.log(message),
    protectedResourceMetadata: {
      resource: publicUrl,
      authorization_servers: [authorizationServer],
      scopes_supported: ["resume:use"],
      bearer_methods_supported: ["header"],
    },
    connection: {
      load: (input) => fetchResumeModel(input, config.resume),
    },
    admin: {
      api: adminApi,
      testSetting: createSettingConnectionTester({
        api: adminApi,
        connections: modelTestConnections,
      }),
      introspect: introspectSession,
      oauth: createPortfolioAdminOAuth({ issuer: authorizationServer }),
      publicUrl,
      oauthResource: config.server.oauthResource,
      authorizationOrigin: new URL(authorizationServer).origin,
    },
    model: () => resumeModelFromSetting(config.modelSetting),
  }).listen(port);
};

const entry = process.argv[1] ?? "";
if (entry.endsWith("server.ts") || entry.endsWith("server.js")) {
  startResumeMcpServer();
}
