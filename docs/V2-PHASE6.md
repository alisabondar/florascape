# V2 Phase 6 — "Ask about my garden" chat

Goal: let the gardener ask follow-up questions about their plan and apply suggested plant swaps, while keeping AI usage on free tiers to a minimum.

## Steps

1. **Chat panel.** The result page has an "Ask about my garden" section with a message list and a text input capped at 300 characters. The conversation is kept with the plan in `sessionStorage` and survives a page reload.
2. **Answers without AI first.** Questions about a plant in the plan's planting guide asking when to plant, how far apart, or how many are answered directly from the plan (timing label and details, spacing, target quantity) without calling an AI provider. These replies are labeled as coming from the plan.
3. **AI answers through the existing providers.** Other questions are sent to a new `/api/garden-chat` route that uses the existing provider chain in `lib/ai/`. The prompt includes a compact plan summary (growing areas with sun, plant groups with quantity and spacing, each area's alternatives), the climate context when available, and at most the last 6 messages. The response uses a JSON schema with a reply and optional swap suggestions.
4. **Suggestions apply as swaps.** A swap suggestion names a plant group and a replacement. The server keeps only suggestions whose plant group exists and whose replacement is in that area's alternatives. Each kept suggestion appears as a button that applies the swap through the same swap logic as the editor dropdown.
5. **Cost guards.** The chat route caches replies for 1 hour, keyed by a hash of the plan summary and the question; limits each client to 20 AI requests per 10 minutes and returns a friendly message when the limit is hit; and returns a friendly "chat unavailable" reply, not an error, when no provider is configured or every provider fails.
6. **Tests.** Unit tests cover plan-based answers, the plan summary, suggestion filtering, the rate limit, and the chat cache. `bun run test`, `bun run lint`, and `bun run build` pass.
