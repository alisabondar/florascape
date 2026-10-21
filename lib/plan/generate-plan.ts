import { generateWithProviders } from "../ai/generate";
import { getCachedPlan, planCacheKey, setCachedPlan } from "../ai/plan-cache";
import { createFallbackGardenPlan } from "./fallback";
import { parseGardenPlanFromLlmText } from "./normalize";
import { buildGardenPlanGenerationPrompt } from "./prompt";
import type {
  AiProvider,
  ClimateContext,
  GardenPlan,
  PlannerInput,
  PlanResponseBody,
  PlanStreamEvent,
} from "../types";
import { GARDEN_PLAN_RESPONSE_SCHEMA } from "./schema";

export const STARTER_MODEL = "fallback-example";

export interface CreatePlanResponseOptions {
  plannerInput: PlannerInput;
  providers: AiProvider[];
  lookupClimate: (zipCode: string) => Promise<ClimateContext | null>;
  emit?: (event: PlanStreamEvent) => void;
  now?: Date;
}

/**
 * Produces the plan response body for a normalized planner input, reporting progress
 * through `emit`: { type: "climate", climate }, then { type: "generating", provider }
 * once per provider tried (or "starter-plan" / "cache"). The caller sends the returned
 * body as JSON or as the final { type: "result" } stream event.
 */
export async function createPlanResponse({
  plannerInput,
  providers,
  lookupClimate,
  emit = () => {},
  now = new Date(),
}: CreatePlanResponseOptions): Promise<PlanResponseBody> {
  const cacheKey = planCacheKey(plannerInput);
  const cached = getCachedPlan(cacheKey);
  if (cached) {
    emit({ type: "climate", climate: cached.climate ?? null });
    emit({ type: "generating", provider: "cache" });
    return { ...cached, cached: true };
  }

  // Climate data is optional context; a failed lookup never blocks plan generation.
  const climate: ClimateContext | null = await lookupClimate(plannerInput.zipCode).catch(() => null);
  emit({ type: "climate", climate });

  // plannerInput is already normalized, so the fallback plan is never null here.
  const starterPlan = (warning: string): PlanResponseBody => ({
    plan: createFallbackGardenPlan(plannerInput, { climate, today: now }) as GardenPlan,
    modelUsed: STARTER_MODEL,
    climate,
    warning,
  });

  if (!providers.length) {
    emit({ type: "generating", provider: "starter-plan" });
    return starterPlan("The custom planner is not configured, so a starter plan is shown instead.");
  }

  const result = await generateWithProviders<GardenPlan>({
    providers,
    prompt: buildGardenPlanGenerationPrompt(plannerInput, now.toISOString().slice(0, 10), climate) ?? "",
    schema: GARDEN_PLAN_RESPONSE_SCHEMA,
    parse: (text) => parseGardenPlanFromLlmText(text, plannerInput, { climate, today: now }),
    onProvider: (provider) => emit({ type: "generating", provider }),
  });

  if (result.plan) {
    const body: PlanResponseBody = { plan: result.plan, modelUsed: result.provider, climate };
    setCachedPlan(cacheKey, body);
    return body;
  }

  console.warn("Garden plan generation fell back to the starter plan", { attempts: result.attempts });
  return starterPlan(
    result.busy
      ? "The custom planner is temporarily busy, so a starter plan is shown instead."
      : "We could not validate the custom plan, so a starter plan is shown instead.",
  );
}

/** Newline-delimited JSON stream of progress events ending with the result event. */
export function planEventStream(
  run: (send: (event: PlanStreamEvent) => void) => Promise<PlanResponseBody>,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: PlanStreamEvent) => controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      try {
        const body = await run(send);
        send({ type: "result", body });
      } catch (error) {
        console.error("Garden plan stream failed", error);
        send({ type: "error", error: "Failed to generate a garden plan." });
      } finally {
        controller.close();
      }
    },
  });
}
