import { beforeEach, describe, expect, test } from "bun:test";
import { CHAT_RATE_LIMIT, handleChat, RATE_LIMITED_REPLY, resetChatState, UNAVAILABLE_REPLY } from "./handle-chat";
import { answerFromPlan } from "./plan-answers";
import { chatPlanSummary } from "./plan-summary";
import { buildChatPrompt, recentMessages } from "./prompt";
import { createRateLimiter } from "./rate-limit";
import { filterSwapSuggestions } from "./suggestions";

const plan = {
  layout: {
    garden: { gardenType: "Raised beds" },
    beds: [
      { id: "bed-1", name: "Bed 1", width: 8, height: 4, sunExposure: "full_sun" },
      { id: "bed-2", name: "Bed 2", width: 3, height: 3, sunExposure: "partial_shade" },
    ],
    plants: [
      { id: "p-tomato", name: "Tomato", bedId: "bed-1", quantity: 2, spacingInches: 24 },
      { id: "p-basil", name: "Basil", bedId: "bed-1", quantity: 10, spacingInches: 12 },
      { id: "p-lettuce", name: "Leaf Lettuce", bedId: "bed-2", quantity: 9, spacingInches: 12 },
    ],
  },
  alternatives: {
    "bed-1": [{ name: "Zinnia" }, { name: "Bush Bean" }],
    "bed-2": [{ name: "Spinach" }, { name: "Kale" }],
  },
  plantingGuide: [
    { plantName: "Tomato", quantity: 2, spacingInches: 24, timingLabel: "Plant this spring", timingDetails: "After the last frost.", sowingAmount: "Buy 2 starts." },
    { plantName: "Leaf Lettuce", quantity: 9, spacingInches: 12, timingLabel: "Plant now", timingDetails: "Cool weather suits it.", sowingAmount: "Sow 14, thin to 9." },
  ],
};

const ask = (text) => [{ role: "user", text }];

function fakeProvider(text, calls = []) {
  return {
    name: "fake:model",
    async generate(request) {
      calls.push(request.prompt);
      return { ok: true, status: 200, text };
    },
  };
}

describe("plan-based answers", () => {
  test("answers timing, spacing, and quantity questions from the guide, including plurals and aliases", () => {
    expect(answerFromPlan("When should I plant tomatoes?", plan)).toMatchObject({
      source: "plan",
      text: "Plant this spring. After the last frost.",
    });
    expect(answerFromPlan("How far apart is the lettuce?", plan).text).toBe("Space Leaf Lettuce about 12 inches apart.");
    expect(answerFromPlan("how many cherry tomato plants?", plan).text).toContain("targets 2 healthy mature Tomato plants");
  });

  test("leaves other questions to the AI", () => {
    expect(answerFromPlan("Why are my tomato leaves yellow?", plan)).toBeNull();
    expect(answerFromPlan("When should I plant garlic?", plan)).toBeNull();
  });
});

describe("plan summary and prompt", () => {
  test("lists areas with sun, plant groups with quantity and spacing, and alternatives", () => {
    const summary = chatPlanSummary(plan);
    expect(summary.areas[0]).toEqual({
      id: "bed-1",
      name: "Bed 1",
      sun: "full_sun",
      sizeFt: "8 x 4",
      plants: [
        { id: "p-tomato", name: "Tomato", quantity: 2, spacingInches: 24 },
        { id: "p-basil", name: "Basil", quantity: 10, spacingInches: 12 },
      ],
      alternatives: ["Zinnia", "Bush Bean"],
    });
  });

  test("keeps at most the last 6 messages and includes climate", () => {
    const messages = Array.from({ length: 9 }, (_, index) => ({ role: index % 2 ? "assistant" : "user", text: `m${index}` }));
    const recent = recentMessages(messages);
    expect(recent).toHaveLength(6);
    expect(recent[0].text).toBe("m3");
    const prompt = buildChatPrompt(chatPlanSummary(plan), { hardinessZone: "6a", frost: { lastSpringFrost: "04-25", firstFallFrost: "10-15" } }, recent);
    expect(prompt).toContain("USDA zone 6a");
    expect(prompt).not.toContain("m2");
  });
});

describe("swap suggestion filtering", () => {
  test("keeps only existing groups with a replacement from the same area's alternatives", () => {
    const kept = filterSwapSuggestions(
      [
        { plantId: "p-tomato", replacement: "zinnia", reason: "Fewer pests." },
        { plantId: "p-basil", replacement: "Spinach", reason: "Wrong area." },
        { plantId: "missing", replacement: "Kale", reason: "No such group." },
        { plantId: "p-lettuce", replacement: "Kale", reason: "Hardier." },
        { plantId: "p-lettuce", replacement: "Spinach", reason: "Duplicate group." },
      ],
      plan,
    );
    expect(kept.map((item) => [item.plantId, item.replacement])).toEqual([
      ["p-tomato", "Zinnia"],
      ["p-lettuce", "Kale"],
    ]);
  });
});

describe("handleChat", () => {
  beforeEach(() => resetChatState());

  test("returns a friendly reply when no provider is configured or all fail", async () => {
    const none = await handleChat({ plan, messages: ask("Is this a good layout?"), providers: [] });
    expect(none).toEqual({ status: 200, body: { reply: UNAVAILABLE_REPLY, suggestions: [], unavailable: true } });

    const failing = { name: "down", generate: async () => ({ ok: false, status: 503 }) };
    const failed = await handleChat({ plan, messages: ask("Is this a good layout?"), providers: [failing] });
    expect(failed.body.unavailable).toBe(true);
  });

  test("filters model suggestions and caches the reply by plan and question", async () => {
    const calls = [];
    const provider = fakeProvider(
      JSON.stringify({
        reply: "Swap the tomato for zinnias.",
        suggestions: [
          { plantId: "p-tomato", replacement: "Zinnia", reason: "Pollinators." },
          { plantId: "p-tomato", replacement: "Watermelon", reason: "Not an alternative." },
        ],
      }),
      calls,
    );
    const first = await handleChat({ plan, messages: ask("Any flower ideas?"), providers: [provider], clientKey: "a" });
    expect(first.body.suggestions).toHaveLength(1);
    expect(first.body.suggestions[0]).toMatchObject({ from: "Tomato", replacement: "Zinnia" });

    const second = await handleChat({ plan, messages: ask("any flower ideas?"), providers: [provider], clientKey: "a" });
    expect(second.body.cached).toBe(true);
    expect(calls).toHaveLength(1);

    const later = await handleChat({
      plan,
      messages: ask("Any flower ideas?"),
      providers: [provider],
      clientKey: "a",
      now: Date.now() + 60 * 60 * 1000,
    });
    expect(later.body.cached).toBeUndefined();
    expect(calls).toHaveLength(2);
  });

  test("limits each client to 20 AI requests per 10 minutes", async () => {
    const provider = fakeProvider(JSON.stringify({ reply: "ok", suggestions: [] }));
    const now = 1_000_000;
    for (let index = 0; index < CHAT_RATE_LIMIT.limit; index += 1) {
      const result = await handleChat({ plan, messages: ask(`question ${index}`), providers: [provider], clientKey: "b", now });
      expect(result.body.rateLimited).toBeUndefined();
    }
    const blocked = await handleChat({ plan, messages: ask("one more"), providers: [provider], clientKey: "b", now });
    expect(blocked.body).toMatchObject({ reply: RATE_LIMITED_REPLY, rateLimited: true });
    const otherClient = await handleChat({ plan, messages: ask("one more"), providers: [provider], clientKey: "c", now });
    expect(otherClient.body.rateLimited).toBeUndefined();
  });

  test("rejects requests without a plan or a trailing user question", async () => {
    expect((await handleChat({ plan: null, messages: ask("hi"), providers: [] })).status).toBe(400);
    expect((await handleChat({ plan, messages: [{ role: "assistant", text: "hi" }], providers: [] })).status).toBe(400);
  });
});

describe("rate limiter", () => {
  test("frees capacity once old hits leave the window", () => {
    const limiter = createRateLimiter({ limit: 2, windowMs: 1000 });
    expect(limiter.check("k", 0).allowed).toBe(true);
    expect(limiter.check("k", 100).allowed).toBe(true);
    expect(limiter.check("k", 200)).toEqual({ allowed: false, retryAfterMs: 800 });
    expect(limiter.check("k", 1001).allowed).toBe(true);
  });
});
