# Spec Audit — docs/V2-PHASE9.md

Source document: `docs/V2-PHASE9.md`. Scope: steps 1–5.

## Checklist

1. S1: "The garden-plan and chat response schemas sent to AI providers are generated from Zod schemas."
2. S1: "A unit test shows each generated schema is identical to the hand-written schema it replaces."
3. S2: "Both API routes validate their request bodies with Zod."
4. S2: "An invalid body returns 400 with a message naming the invalid fields; valid requests behave as before."
5. S3: "sends `Accept: application/x-ndjson`, the route streams newline-delimited JSON events — `climate`, `generating` (with the provider name), and finally `result`, whose payload equals the normal JSON response body"
6. S3: "Requests without that header get the unchanged JSON response."
7. S3: "The loading screen highlights the stage reported by the latest event."
8. S4: "Playwright tests run with `bun run test:e2e` against the dev server with AI providers and climate lookups disabled through environment variables."
9. S4: "completing the three planner steps to a starter plan; Shuffle Plants changing the plants; a plan-based chat answer; and the calendar download producing a `.ics` file"
10. S5: "Unit tests cover schema generation, request validation, and the stream event order."
11. S5: "`bun run test`, `bun run lint`, `bun run build`, and `bun run test:e2e` pass"
