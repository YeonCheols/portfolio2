import { createPortfolioAdminApi } from "@mcp/infrastructure/portfolio-api/admin-api";
import { createPortfolioAdminOAuth } from "@mcp/interfaces/admin/auth/admin-oauth";
import { createSettingConnectionTester } from "@mcp/modules/ai-models/setting-connection-test";
import {
  fetchGeminiModelResult,
  fetchGeminiModelText,
} from "@mcp/infrastructure/ai/providers/gemini-model-connection";
import {
  fetchOpenAiModelResult,
  fetchOpenAiModelText,
} from "@mcp/infrastructure/ai/providers/open-ai-model-connection";
import {
  fetchOpenRouterModelResult,
  fetchOpenRouterModelText,
} from "@mcp/infrastructure/ai/providers/open-router-model-connection";
import { fetchActiveResumeModelSetting } from "@mcp/infrastructure/portfolio-api/resume-model-setting";
import { fetchResumeModel } from "@mcp/infrastructure/portfolio-api/resume-connection";
import { withSessionCache } from "@mcp/bootstrap/cached-session-introspector";
import {
  createResumeMcpServer,
  type ResumeModelSource,
} from "@mcp/bootstrap/create-resume-mcp-server";
import { createPortfolioApiSessionIntrospector } from "@mcp/infrastructure/portfolio-api/portfolio-api-introspector";
import {
  readMcpRuntimeConfig,
  readModelSettingConnection,
  type RuntimeEnv,
} from "@mcp/bootstrap/runtime-config";
import { createResumeDebugArchiveAdmin } from "@mcp/modules/resume/archive/resume-debug-archive-admin";
import type { ResumeModelClient } from "@mcp/modules/resume/generation/run-resume-harness";
import { createSupabaseStorage } from "@mcp/infrastructure/storage/supabase-storage";
import { resumeToolDefinitions } from "@mcp/interfaces/tools/handle-mcp-request";
import { createResumeToolPolicy } from "@mcp/modules/resume/tool-policy/resume-tool-policy";
import { resumeToolSamples } from "@mcp/interfaces/tools/resume/resume-tool-samples";
import { createResumeToolPresets } from "@mcp/modules/resume/tool-presets/resume-tool-presets";
import {
  ResumeConnectionError,
  type ResumeConnectionFetch,
} from "@mcp/infrastructure/connection/connection";

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
    generate: async (input, onModel) => {
      resolved ??= resolve();
      const { setting, connect } = await resolved;
      await onModel?.({
        provider: setting.provider,
        modelName: setting.modelName,
      });

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

  // 저장과 관리 화면 조회가 같은 연결을 쓴다. 설정이 없으면 둘 다 꺼진다
  const storage = config.storage
    ? createSupabaseStorage(config.storage)
    : undefined;

  return createResumeMcpServer({
    introspect,
    environment: config.modelSetting.environment,
    storage,
    // 저장소가 없으면 정책도 없어 모든 도구가 활성인 기존 동작을 유지한다
    toolPolicy: storage
      ? createResumeToolPolicy({
          storage,
          environment: config.modelSetting.environment,
          knownTools: resumeToolDefinitions.map((tool) => tool.name),
        })
      : undefined,
    toolPresets: storage
      ? createResumeToolPresets({
          storage,
          environment: config.modelSetting.environment,
          knownTools: resumeToolDefinitions.map((tool) => tool.name),
          sampleXml: (name) => {
            const xml = resumeToolSamples[name]?.xml;
            return typeof xml === "string" ? xml : undefined;
          },
        })
      : undefined,
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
      debugArchive: storage
        ? createResumeDebugArchiveAdmin(storage)
        : undefined,
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
