import { chatResponse, toProviderSchema } from "../schemas/responses";
import type { ChatMessage, ClimateContext } from "../types";
import type { ChatPlanSummary } from "./plan-summary";

export type ChatTurn = Pick<ChatMessage, "role" | "text">;

function isChatTurn(message: unknown): message is { role: ChatTurn["role"]; text?: unknown } {
  const role = (message as { role?: unknown } | null)?.role;
  return role === "user" || role === "assistant";
}

export const CHAT_MAX_MESSAGES = 6;
export const CHAT_MESSAGE_MAX_LENGTH = 300;

export const CHAT_RESPONSE_SCHEMA = toProviderSchema(chatResponse);

/** Last messages, trimmed and length-capped, alternating user/assistant roles only. */
export function recentMessages(messages: unknown): ChatTurn[] {
  return (Array.isArray(messages) ? messages : [])
    .filter(isChatTurn)
    .filter((message) => String(message.text || "").trim())
    .slice(-CHAT_MAX_MESSAGES)
    .map((message) => ({
      role: message.role,
      text: String(message.text).trim().slice(0, message.role === "user" ? CHAT_MESSAGE_MAX_LENGTH : 1200),
    }));
}

export function buildChatPrompt(
  summary: ChatPlanSummary | null,
  climate: ClimateContext | null | undefined,
  messages: ChatTurn[],
): string {
  const climateLines = climate?.hardinessZone
    ? [
        `USDA zone ${climate.hardinessZone}`,
        climate.frost
          ? `median last spring frost ${climate.frost.lastSpringFrost || "none"}, first fall frost ${climate.frost.firstFallFrost || "none"}`
          : "",
        climate.forecast?.frostWarning ? `frost forecast on ${climate.forecast.frostDays.join(", ")}` : "",
      ].filter(Boolean).join("; ")
    : "not available";

  return `You are a friendly, practical garden helper answering a beginner's follow-up questions about their garden plan.

Current garden plan (authoritative):
${JSON.stringify(summary)}

Climate context (authoritative): ${climateLines}

Conversation so far (most recent last):
${messages.map((message) => `${message.role === "user" ? "Gardener" : "Helper"}: ${message.text}`).join("\n")}

Rules:
- Answer the gardener's last message in at most 120 words, plainly and kindly.
- Base answers on the plan and climate context above; say so briefly when something depends on local conditions.
- Only suggest swaps when they clearly help with the question. Each suggestion must use a plant group "id" from the plan as plantId and a name from the SAME area's "alternatives" list as replacement. Return an empty suggestions array otherwise.
- Do not invent plant groups, areas, or alternatives. Do not present gardening folklore as fact.
- Return JSON matching the response schema.`;
}
