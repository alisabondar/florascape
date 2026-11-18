import { NextResponse } from "next/server";
import { getConfiguredProviders } from "../../../lib/ai/providers";
import { clientKeyFromRequest } from "../../../lib/ai/rate-limit";
import { handleChat } from "../../../lib/chat/handle-chat";
import { aiEnabled, chatEnabled } from "../../../lib/runtime-flags";
import { chatRequest, parseRequest } from "../../../lib/schemas/requests";
import type { ClimateContext, GardenPlan } from "../../../lib/types";

export async function POST(request: Request) {
  if (!chatEnabled()) {
    return NextResponse.json({ error: "The garden helper is coming soon." }, { status: 404 });
  }

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
    clientKey: clientKeyFromRequest(request),
    providers: aiEnabled() ? getConfiguredProviders() : [],
  });
  return NextResponse.json(responseBody, { status });
}
