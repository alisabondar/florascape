import { beforeEach, describe, expect, test } from "bun:test";
import { clearPlanCache } from "../ai/plan-cache";
import { createPlanResponse, planEventStream } from "./generate-plan";
import { readPlanStream } from "./read-plan-stream";
import type {
  AiGenerateResult,
  AiProvider,
  ClimateContext,
  PlannerInput,
  PlanStreamEvent,
} from "../types";

// Flattened view of the event union so tests can read any field.
type LooseEvent = { type: string; provider?: string; climate?: ClimateContext | null };

const plannerInput: PlannerInput = {
  zipCode: "80205",
  gardenType: "raised_beds",
  gardenTypeLabel: "Raised beds",
  plantTypes: ["vegetables", "herbs"],
  selectedPlants: ["Vegetables", "Herbs"],
  preferences: "",
  inGround: null,
  units: [{ id: "bed-1", name: "Bed 1", width: 8, length: 4, sunExposure: "full_sun", sunExposureLabel: "full_sun" }],
};
const now = new Date("2026-06-15T12:00:00Z");
const climate: ClimateContext = { hardinessZone: "6a", temperatureRange: null, frost: null, forecast: null };
const lookupClimate = async () => climate;
const failing = (name: string): AiProvider => ({
  name,
  generate: async () => ({ ok: false, status: 503 }) as AiGenerateResult,
});
const valid: AiProvider = {
  name: "fake:model",
  generate: async () => ({
    ok: true,
    status: 200,
    text: JSON.stringify({
      recommendedGardenType: "raised_beds",
      summary: "Sunny bed.",
      layout: { plants: [{ name: "Tomato", bedId: "bed-1", spacingInches: 24, quantity: 2, sunNeeds: "full_sun", placementReason: "Sun" }] },
      tips: {},
      plantingGuide: [],
      alternatives: [],
    }),
  }) as AiGenerateResult,
};

function collect() {
  const events: LooseEvent[] = [];
  return { events, emit: (event: PlanStreamEvent) => events.push(event) };
}

describe("plan progress events", () => {
  beforeEach(() => clearPlanCache());

  test("reports climate, then each provider tried, in order", async () => {
    const { events, emit } = collect();
    const body = await createPlanResponse({ plannerInput, providers: [failing("down:a"), valid], lookupClimate, emit, now });
    expect(events.map((event) => [event.type, event.provider ?? null])).toEqual([
      ["climate", null],
      ["generating", "down:a"],
      ["generating", "fake:model"],
    ]);
    expect(events[0].climate).toEqual(climate);
    expect(body.modelUsed).toBe("fake:model");
  });

  test("reports the starter plan when no provider is configured, and the cache on a repeat", async () => {
    const first = collect();
    const starter = await createPlanResponse({ plannerInput, providers: [], lookupClimate, emit: first.emit, now });
    expect(first.events.map((event) => event.provider ?? event.type)).toEqual(["climate", "starter-plan"]);
    expect(starter.modelUsed).toBe("fallback-example");

    await createPlanResponse({ plannerInput, providers: [valid], lookupClimate, now });
    const repeat = collect();
    const cached = await createPlanResponse({ plannerInput, providers: [valid], lookupClimate, emit: repeat.emit, now });
    expect(repeat.events.map((event) => event.provider ?? event.type)).toEqual(["climate", "cache"]);
    expect(cached.cached).toBe(true);
  });

  test("the stream ends with a result event whose body equals the JSON response", async () => {
    const json = await createPlanResponse({ plannerInput, providers: [], lookupClimate, now });
    const stream = planEventStream((emit) => createPlanResponse({ plannerInput, providers: [], lookupClimate, emit, now }));
    const seen: string[] = [];
    const body = await readPlanStream(new Response(stream), (event) => seen.push(event.type));
    expect(seen).toEqual(["climate", "generating", "result"]);
    expect(body).toEqual(json);
  });

  test("the reader rejects on an error event or a missing result", async () => {
    const errorStream = new Response('{"type":"climate","climate":null}\n{"type":"error","error":"boom"}\n');
    await expect(readPlanStream(errorStream)).rejects.toThrow("boom");
    await expect(readPlanStream(new Response('{"type":"climate"}\n'))).rejects.toThrow("ended before a result");
  });
});
