import { beforeEach, describe, expect, test } from "bun:test";
import { generateWithProviders } from "./generate";
import { clearPlanCache, getCachedPlan, planCacheKey, setCachedPlan } from "./plan-cache";
import { getConfiguredProviders } from "./providers";
import type { AiGenerateResult, AiProvider, PlannerInput, PlanResponseBody } from "../types";

type FakeResult = Partial<AiGenerateResult> | Error;

function fakeProvider(name: string, results: FakeResult[], calls: string[]): AiProvider {
  let index = 0;
  return {
    name,
    async generate() {
      calls.push(name);
      const result = results[Math.min(index, results.length - 1)];
      index += 1;
      if (result instanceof Error) throw result;
      return { ok: false, status: 0, text: "", finishReason: "unknown", ...result };
    },
  };
}

const parse = (text: string) => (text === "valid" ? { ok: true } : null);

describe("provider fallback", () => {
  test("tries providers in order and retries 429/5xx once before moving on", async () => {
    const calls: string[] = [];
    const result = await generateWithProviders({
      providers: [
        fakeProvider("a", [{ ok: false, status: 429 }], calls),
        fakeProvider("b", [{ ok: false, status: 503 }], calls),
        fakeProvider("c", [{ ok: true, status: 200, text: "valid" }], calls),
      ],
      prompt: "p",
      schema: {},
      parse,
    });
    expect(calls).toEqual(["a", "a", "b", "b", "c"]);
    expect(result.provider).toBe("c");
  });

  test("moves past 400/403 immediately and retries an invalid response once", async () => {
    const calls: string[] = [];
    const result = await generateWithProviders({
      providers: [
        fakeProvider("bad-request", [{ ok: false, status: 400 }], calls),
        fakeProvider("forbidden", [{ ok: false, status: 403 }], calls),
        fakeProvider("invalid-then-ok", [{ ok: true, status: 200, text: "junk" }, { ok: true, status: 200, text: "valid" }], calls),
      ],
      prompt: "p",
      schema: {},
      parse,
    });
    expect(calls).toEqual(["bad-request", "forbidden", "invalid-then-ok", "invalid-then-ok"]);
    expect(result.plan).toEqual({ ok: true });
  });

  test("returns no plan when every provider fails", async () => {
    const calls: string[] = [];
    const result = await generateWithProviders({
      providers: [fakeProvider("down", [new Error("offline")], calls)],
      prompt: "p",
      schema: {},
      parse,
    });
    expect(result.plan).toBeNull();
    expect(result.busy).toBe(true);
  });

  test("orders configured providers Gemini, Groq, then OpenRouter and skips missing keys", () => {
    const names = getConfiguredProviders({
      GEMINI_API_KEY: "g",
      GROQ_API_KEY: "q",
      GROQ_MODEL: "groq-model",
      OPENROUTER_API_KEY: "o",
      OPENROUTER_MODEL: "free-model:free",
    }).map((provider) => provider.name);
    expect(names).toEqual(["gemini:gemini-3.6-flash", "groq:groq-model", "openrouter:free-model:free"]);
    expect(getConfiguredProviders({})).toEqual([]);
  });
});

describe("plan cache", () => {
  beforeEach(() => clearPlanCache());

  test("keys by input hash and expires after one hour", () => {
    const key = planCacheKey({ zipCode: "80123" } as PlannerInput);
    expect(key).toBe(planCacheKey({ zipCode: "80123" } as PlannerInput));
    expect(key).not.toBe(planCacheKey({ zipCode: "80124" } as PlannerInput));

    const body = { plan: 1 } as unknown as PlanResponseBody;
    setCachedPlan(key, body, 0);
    expect(getCachedPlan(key, 59 * 60 * 1000)).toEqual(body);
    expect(getCachedPlan(key, 60 * 60 * 1000)).toBeNull();
  });
});
