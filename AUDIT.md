# Spec Audit — docs/V2-PHASE6.md

Source document: `docs/V2-PHASE6.md`. Scope: steps 1–6.

## Checklist

1. S1: "an "Ask about my garden" section with a message list and a text input capped at 300 characters"
2. S1: "The conversation is kept with the plan in `sessionStorage` and survives a page reload."
3. S2: "Questions about a plant in the plan's planting guide asking when to plant, how far apart, or how many are answered directly from the plan (timing label and details, spacing, target quantity) without calling an AI provider."
4. S2: "These replies are labeled as coming from the plan."
5. S3: "Other questions are sent to a new `/api/garden-chat` route that uses the existing provider chain in `lib/ai/`."
6. S3: "The prompt includes a compact plan summary (growing areas with sun, plant groups with quantity and spacing, each area's alternatives), the climate context when available, and at most the last 6 messages."
7. S3: "The response uses a JSON schema with a reply and optional swap suggestions."
8. S4: "The server keeps only suggestions whose plant group exists and whose replacement is in that area's alternatives."
9. S4: "Each kept suggestion appears as a button that applies the swap through the same swap logic as the editor dropdown."
10. S5: "caches replies for 1 hour, keyed by a hash of the plan summary and the question"
11. S5: "limits each client to 20 AI requests per 10 minutes and returns a friendly message when the limit is hit"
12. S5: "returns a friendly "chat unavailable" reply, not an error, when no provider is configured or every provider fails"
13. S6: "Unit tests cover plan-based answers, the plan summary, suggestion filtering, the rate limit, and the chat cache."
14. S6: "`bun run test`, `bun run lint`, and `bun run build` pass"

## Round 1

Auditor: fresh subagent. Result: **14/14 MET**. `bun run test` 57 pass / 0 fail; `bun run lint` clean; `bun run build` succeeded. Manual browser run: plan-based spacing answer with no AI call, friendly "unavailable" notice while Gemini returned 503, chat persisted across reload, and a suggestion button applied the swap in the editor. A live AI reply was not observed because Gemini was unavailable during testing; that path is covered by fake-provider tests.

### Findings
None.

### Out-of-scope (not traceable to the spec; not acted on)
- At most 3 suggestions per reply; replies capped at 120 words.
- Cache hits are served before the rate-limit check, so they don't count toward the 20 AI requests.

## Result
Stopped after round 1: zero PARTIAL/MISSING. Scope-creep breaker did not fire.
