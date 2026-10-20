import { NextResponse } from "next/server";
import {
  buildGardenPlanGenerationPrompt,
  createFallbackGardenPlan,
  GARDEN_PLAN_RESPONSE_SCHEMA,
  normalizePlannerInput,
  parseGardenPlanFromLlmText,
} from "../../../lib/garden-plan";
import { getClimateContext } from "../../../lib/climate";
import { generateWithProviders } from "../../../lib/ai/generate";
import { getCachedPlan, planCacheKey, setCachedPlan } from "../../../lib/ai/plan-cache";
import { getConfiguredProviders } from "../../../lib/ai/providers";

export async function POST(request) {
  let payload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const plannerInput = normalizePlannerInput(payload?.plannerInput);
  if (!plannerInput) {
    return NextResponse.json({ error: "Valid planner input is required." }, { status: 400 });
  }

  const cacheKey = planCacheKey(plannerInput);
  const cached = getCachedPlan(cacheKey);
  if (cached) {
    return NextResponse.json({ ...cached, cached: true });
  }

  // Climate data is optional context; a failed lookup never blocks plan generation.
  const climate = await getClimateContext(plannerInput.zipCode).catch(() => null);
  const starterPlan = (warning) =>
    NextResponse.json({
      plan: createFallbackGardenPlan(plannerInput, { climate }),
      modelUsed: "fallback-example",
      climate,
      warning,
    });

  const providers = getConfiguredProviders();
  if (!providers.length) {
    console.warn("No AI provider is configured; returning the starter plan.");
    return starterPlan("The custom planner is not configured, so a starter plan is shown instead.");
  }

  const currentDate = new Date().toISOString().slice(0, 10);
  const prompt = buildGardenPlanGenerationPrompt(plannerInput, currentDate, climate);
  const result = await generateWithProviders({
    providers,
    prompt,
    schema: GARDEN_PLAN_RESPONSE_SCHEMA,
    parse: (text) => parseGardenPlanFromLlmText(text, plannerInput, { climate }),
  });

  if (result.plan) {
    const body = { plan: result.plan, modelUsed: result.provider, climate };
    setCachedPlan(cacheKey, body);
    return NextResponse.json(body);
  }

  console.warn("Garden plan generation fell back to the starter plan", { attempts: result.attempts });
  return starterPlan(
    result.busy
      ? "The custom planner is temporarily busy, so a starter plan is shown instead."
      : "We could not validate the custom plan, so a starter plan is shown instead.",
  );
}
