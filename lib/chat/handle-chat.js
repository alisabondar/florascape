import { generateWithProviders } from "../ai/generate";
import { createTtlCache, hashKey } from "../ai/plan-cache";
import { chatPlanSummary } from "./plan-summary";
import { buildChatPrompt, CHAT_RESPONSE_SCHEMA, recentMessages } from "./prompt";
import { createRateLimiter } from "./rate-limit";
import { filterSwapSuggestions } from "./suggestions";

const CHAT_CACHE_TTL_MS = 60 * 60 * 1000;
export const CHAT_RATE_LIMIT = { limit: 20, windowMs: 10 * 60 * 1000 };

export const UNAVAILABLE_REPLY =
  "The garden helper is unavailable right now. Your plan's guide, tips, and neighbor check above still apply; please try again in a little while.";
export const RATE_LIMITED_REPLY =
  "You've asked a lot of questions in a short time. Please wait a few minutes and try again; this keeps the free helper available for everyone.";

const chatCache = createTtlCache(CHAT_CACHE_TTL_MS);
const rateLimiter = createRateLimiter(CHAT_RATE_LIMIT);

export function resetChatState() {
  chatCache.clear();
  rateLimiter.clear();
}

function parseChatResponse(text, plan) {
  try {
    const parsed = JSON.parse(text);
    const reply = String(parsed?.reply || "").trim();
    if (!reply) {
      return null;
    }
    return { reply: reply.slice(0, 1200), suggestions: filterSwapSuggestions(parsed.suggestions, plan) };
  } catch {
    return null;
  }
}

/**
 * Answers one chat turn. Order: validate, cache, rate limit, providers. Never throws for
 * provider trouble; returns a friendly reply with `unavailable: true` instead.
 */
export async function handleChat({ plan, climate, messages, clientKey, providers, fetchImpl, now = Date.now() }) {
  const summary = chatPlanSummary(plan);
  const history = recentMessages(messages);
  const question = history.at(-1);
  if (!summary || question?.role !== "user") {
    return { status: 400, body: { error: "A plan and a question are required." } };
  }

  const cacheKey = hashKey({ summary, question: question.text.toLowerCase() });
  const cached = chatCache.get(cacheKey, now);
  if (cached) {
    return { status: 200, body: { ...cached, cached: true } };
  }

  if (!rateLimiter.check(clientKey || "anonymous", now).allowed) {
    return { status: 200, body: { reply: RATE_LIMITED_REPLY, suggestions: [], rateLimited: true } };
  }

  if (!providers.length) {
    return { status: 200, body: { reply: UNAVAILABLE_REPLY, suggestions: [], unavailable: true } };
  }

  const result = await generateWithProviders({
    providers,
    prompt: buildChatPrompt(summary, climate, history),
    schema: CHAT_RESPONSE_SCHEMA,
    parse: (text) => parseChatResponse(text, plan),
    fetchImpl,
  });
  if (!result.plan) {
    console.warn("Garden chat fell back to the unavailable reply", { attempts: result.attempts });
    return { status: 200, body: { reply: UNAVAILABLE_REPLY, suggestions: [], unavailable: true } };
  }

  const body = { ...result.plan, modelUsed: result.provider };
  chatCache.set(cacheKey, body, now);
  return { status: 200, body };
}
