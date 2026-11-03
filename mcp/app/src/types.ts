export type ModelEnvironment = "development" | "production";

export type ModelSetting = {
  id: number;
  environment: ModelEnvironment;
  provider: string;
  modelName: string;
  url: string;
  hasApiKey: boolean;
  isActive: boolean;
};

export type ModelSettingInput = Pick<
  ModelSetting,
  "environment" | "provider" | "modelName" | "url"
> & { apiKey?: string };
