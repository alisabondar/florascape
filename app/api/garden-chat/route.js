import { NextResponse } from "next/server";
import { getConfiguredProviders } from "../../../lib/ai/providers";
import { handleChat } from "../../../lib/chat/handle-chat";
import { aiEnabled } from "../../../lib/runtime-flags";
import { chatRequest, parseRequest } from "../../../lib/schemas/requests";

function clientKey(request) {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0].trim() || request.headers.get("x-real-ip") || "local";
}

export async function POST(request) {
  let payload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = parseRequest(chatRequest, payload);
  if (parsed.error) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const { status, body } = await handleChat({
    plan: payload?.plan,
    climate: payload?.climate || null,
    messages: payload?.messages,
    clientKey: clientKey(request),
    providers: aiEnabled() ? getConfiguredProviders() : [],
  });
  return NextResponse.json(body, { status });
}
