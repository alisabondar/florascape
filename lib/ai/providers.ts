import { createGeminiProvider, DEFAULT_GEMINI_MODEL } from "./gemini";
import { createOpenAICompatibleProvider } from "./openai-compatible";
import type { AiProvider } from "../types";

type ProviderEnv = Partial<Record<string, string>>;

/** Providers in try order: Gemini, then Groq, then OpenRouter. Unconfigured ones are skipped. */
export function getConfiguredProviders(env: ProviderEnv = process.env): AiProvider[] {
  const providers: AiProvider[] = [];

  if (env.GEMINI_API_KEY) {
    const model = env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
    providers.push(createGeminiProvider({ apiKey: env.GEMINI_API_KEY, model }));
    // Keep the known-good default behind a custom model in case the custom one is unavailable.
    if (model !== DEFAULT_GEMINI_MODEL) {
      providers.push(createGeminiProvider({ apiKey: env.GEMINI_API_KEY, model: DEFAULT_GEMINI_MODEL }));
    }
  }
  if (env.GROQ_API_KEY && env.GROQ_MODEL) {
    providers.push(
      createOpenAICompatibleProvider({
        name: "groq",
        baseUrl: "https://api.groq.com/openai/v1",
        apiKey: env.GROQ_API_KEY,
        model: env.GROQ_MODEL,
      }),
    );
  }
  if (env.OPENROUTER_API_KEY && env.OPENROUTER_MODEL) {
    providers.push(
      createOpenAICompatibleProvider({
        name: "openrouter",
        baseUrl: "https://openrouter.ai/api/v1",
        apiKey: env.OPENROUTER_API_KEY,
        model: env.OPENROUTER_MODEL,
      }),
    );
  }

  return providers;
}
