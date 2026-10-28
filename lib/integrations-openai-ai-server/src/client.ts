import OpenAI from "openai";

export function isOpenAIConfigured(): boolean {
  return Boolean(
    process.env.AI_INTEGRATIONS_OPENAI_BASE_URL &&
      process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  );
}

export function getOpenAIClient(): OpenAI {
  if (!isOpenAIConfigured()) {
    throw new Error(
      "AI chat is not configured. Set AI_INTEGRATIONS_OPENAI_BASE_URL and AI_INTEGRATIONS_OPENAI_API_KEY to enable it.",
    );
  }

  return new OpenAI({
    apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
    baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  });
}

// Keep the existing public API while delaying client construction until an
// AI feature is actually used. Core app routes can run without AI credentials.
export const openai = new Proxy({} as OpenAI, {
  get(_target, property) {
    return Reflect.get(getOpenAIClient(), property);
  },
});
