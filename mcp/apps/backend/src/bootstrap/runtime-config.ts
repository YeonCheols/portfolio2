export type RuntimeEnvironment = "development" | "production";
export type RuntimeEnv = Record<string, string | undefined>;
export type ModelSettingConnection = {
  settingUrl: string;
  settingToken: string;
  environment: RuntimeEnvironment;
};

const required = (env: RuntimeEnv, key: string): string => {
  const value = env[key]?.trim() ?? "";
  if (!value || value.includes("__REQUIRED_"))
    throw new Error(`${key} is required`);
  return value;
};

const connectionUrl = (
  value: string,
  key: string,
  environment: RuntimeEnvironment,
): string => {
  try {
    const url = new URL(value);
    const local =
      environment === "development" &&
      url.protocol === "http:" &&
      ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    if (
      (url.protocol !== "https:" && !local) ||
      url.username ||
      url.password ||
      url.hash
    )
      throw new Error();
    return value;
  } catch {
    throw new Error(
      `${key} must be an https URL or a development localhost URL`,
    );
  }
};

// 이 연결 정보만 정적 설정이 소유한다. 모델과 모델 키는 요청 시 조회한다.
export const readModelSettingConnection = (
  env: RuntimeEnv,
): ModelSettingConnection => {
  const settingUrl = required(env, "RESUME_MODEL_SETTING_URL");
  const settingToken = required(env, "RESUME_MODEL_SETTING_TOKEN");
  const environment = required(env, "RESUME_MODEL_ENVIRONMENT");
  if (environment !== "development" && environment !== "production")
    throw new Error(
      "RESUME_MODEL_ENVIRONMENT must be development or production",
    );
  connectionUrl(settingUrl, "RESUME_MODEL_SETTING_URL", environment);
  if (new URL(settingUrl).search)
    throw new Error("RESUME_MODEL_SETTING_URL must not contain a query");
  return { settingUrl, settingToken, environment };
};

export const readMcpRuntimeConfig = (env: RuntimeEnv) => {
  if (
    !env.RESUME_CONNECTION_URL?.trim() ||
    !env.RESUME_CONNECTION_TOKEN?.trim()
  )
    throw new Error(
      "RESUME_CONNECTION_URL and RESUME_CONNECTION_TOKEN are required",
    );
  const modelSetting = readModelSettingConnection(env);
  const { environment } = modelSetting;
  const url = (key: string) =>
    connectionUrl(required(env, key), key, environment);
  const apiUrl = url("PORTFOLIO_API_URL").replace(/\/+$/, "");
  const publicUrl = url("MCP_PUBLIC_URL");
  const authorizationServer = connectionUrl(
    env.PORTFOLIO_API_AUTH_ISSUER?.trim() || `${apiUrl}/auth`,
    "PORTFOLIO_API_AUTH_ISSUER",
    environment,
  );
  const portText = env.PORT ?? "8080";
  const port = Number(portText);
  const storageKeys = [
    "SUPABASE_URL",
    "SUPABASE_SECRET_KEY",
    "MCP_STORAGE_BUCKET",
  ];
  const storage = storageKeys.some((key) => env[key] !== undefined)
    ? {
        url: required(env, "SUPABASE_URL"),
        secretKey: required(env, "SUPABASE_SECRET_KEY"),
        bucket: required(env, "MCP_STORAGE_BUCKET"),
      }
    : undefined;
  if (
    !/^\d+$/.test(portText) ||
    !Number.isInteger(port) ||
    port < 1 ||
    port > 65535
  )
    throw new Error("PORT must be an integer between 1 and 65535");
  return {
    server: {
      port,
      publicUrl,
      authorizationServer,
      oauthResource: connectionUrl(
        env.MCP_ADMIN_OAUTH_RESOURCE_URL?.trim() || publicUrl,
        "MCP_ADMIN_OAUTH_RESOURCE_URL",
        environment,
      ),
    },
    api: { apiUrl, serviceToken: required(env, "MCP_AUTH_SERVICE_TOKEN") },
    resume: {
      url: url("RESUME_CONNECTION_URL"),
      token: required(env, "RESUME_CONNECTION_TOKEN"),
    },
    modelSetting,
    storage,
  };
};
