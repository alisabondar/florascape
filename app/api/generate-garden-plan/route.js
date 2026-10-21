import { NextResponse } from "next/server";
import { getConfiguredProviders } from "../../../lib/ai/providers";
import { getClimateContext } from "../../../lib/climate";
import { normalizePlannerInput } from "../../../lib/garden-plan";
import { createPlanResponse, planEventStream } from "../../../lib/plan/generate-plan";
import { aiEnabled, climateEnabled } from "../../../lib/runtime-flags";
import { parseRequest, planRequest } from "../../../lib/schemas/requests";

export async function POST(request) {
  let payload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = parseRequest(planRequest, payload);
  if (parsed.error) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const plannerInput = normalizePlannerInput(payload?.plannerInput);
  if (!plannerInput) {
    return NextResponse.json({ error: "Valid planner input is required." }, { status: 400 });
  }

  const options = {
    plannerInput,
    providers: aiEnabled() ? getConfiguredProviders() : [],
    lookupClimate: climateEnabled() ? getClimateContext : async () => null,
  };

  if (request.headers.get("accept")?.includes("application/x-ndjson")) {
    return new Response(
      planEventStream((emit) => createPlanResponse({ ...options, emit })),
      { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.json(await createPlanResponse(options));
}
