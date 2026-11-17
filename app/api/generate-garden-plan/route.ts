import { NextResponse } from "next/server";
import { getConfiguredProviders } from "../../../lib/ai/providers";
import { clientKeyFromRequest, createRateLimiter } from "../../../lib/ai/rate-limit";
import { getClimateContext } from "../../../lib/climate";
import { normalizePlannerInput } from "../../../lib/garden-plan";
import { createPlanResponse, planEventStream } from "../../../lib/plan/generate-plan";
import { aiEnabled, climateEnabled } from "../../../lib/runtime-flags";
import { parseRequest, planRequest } from "../../../lib/schemas/requests";

// Limits AI plan calls only (cache hits and starter plans cost nothing). In-memory, so each
// server instance counts separately; free-tier keys without billing are the hard cost cap.
const perClient = createRateLimiter({ limit: 10, windowMs: 60 * 60 * 1000 });
const sitewide = createRateLimiter({ limit: 300, windowMs: 24 * 60 * 60 * 1000 });

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = parseRequest(planRequest, payload);
  if (parsed.error) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const plannerInput = normalizePlannerInput((payload as { plannerInput?: unknown }).plannerInput);
  if (!plannerInput) {
    return NextResponse.json({ error: "Valid planner input is required." }, { status: 400 });
  }

  const options = {
    plannerInput,
    providers: aiEnabled() ? getConfiguredProviders() : [],
    lookupClimate: climateEnabled() ? getClimateContext : async () => null,
    allowAi: () => perClient.check(clientKeyFromRequest(request)).allowed && sitewide.check("all").allowed,
  };

  if (request.headers.get("accept")?.includes("application/x-ndjson")) {
    return new Response(
      planEventStream((emit) => createPlanResponse({ ...options, emit })),
      { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.json(await createPlanResponse(options));
}
