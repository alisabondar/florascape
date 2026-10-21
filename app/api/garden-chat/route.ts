import { NextResponse } from "next/server";
import { getConfiguredProviders } from "../../../lib/ai/providers";
import { handleChat } from "../../../lib/chat/handle-chat";
import { aiEnabled } from "../../../lib/runtime-flags";
import { chatRequest, parseRequest } from "../../../lib/schemas/requests";
import type { ClimateContext, GardenPlan } from "../../../lib/types";

function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0].trim() || request.headers.get("x-real-ip") || "local";
}

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = parseRequest(chatRequest, payload);
  if (parsed.error) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  // The envelope was validated above; handleChat reads the raw payload as before.
  const body = payload as { plan?: GardenPlan; climate?: ClimateContext | null; messages?: unknown };
  const { status, body: responseBody } = await handleChat({
    plan: body.plan,
    climate: body.climate || null,
    messages: body.messages,
    clientKey: clientKey(request),
    providers: aiEnabled() ? getConfiguredProviders() : [],
  });
  return NextResponse.json(responseBody, { status });
}
