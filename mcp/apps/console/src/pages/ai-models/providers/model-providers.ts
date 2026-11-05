export const MODEL_PROVIDERS = [
  {
    value: "openrouter",
    label: "OpenRouter",
    url: "https://openrouter.ai/api/v1/chat/completions",
    modelExample: "openai/gpt-4.1",
    modelsUrl: "https://openrouter.ai/models",
  },
  {
    value: "openai",
    label: "OpenAI",
    url: "https://api.openai.com/v1/chat/completions",
    modelExample: "gpt-4.1",
    modelsUrl: "https://developers.openai.com/api/docs/models",
  },
  {
    value: "gemini",
    label: "Gemini",
    url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    modelExample: "gemini-3.8-flash",
    modelsUrl: "https://ai.google.dev/gemini-api/docs/models",
  },
] as const;
