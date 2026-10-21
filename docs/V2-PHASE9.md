# V2 Phase 9 — Schemas, streaming progress, and end-to-end tests

Goal: one source of truth for AI response shapes, validated API inputs, honest loading progress, and browser tests of the main flows. TypeScript is deferred until a TypeScript 5.x release is installed (Next.js 15.5 does not support TypeScript 7).

## Steps

1. **Zod response schemas.** The garden-plan and chat response schemas sent to AI providers are generated from Zod schemas. A unit test shows each generated schema is identical to the hand-written schema it replaces.
2. **Request validation.** Both API routes validate their request bodies with Zod. An invalid body returns 400 with a message naming the invalid fields; valid requests behave as before.
3. **Streaming progress.** When a request to `/api/generate-garden-plan` sends `Accept: application/x-ndjson`, the route streams newline-delimited JSON events — `climate`, `generating` (with the provider name), and finally `result`, whose payload equals the normal JSON response body. Requests without that header get the unchanged JSON response. The loading screen highlights the stage reported by the latest event.
4. **End-to-end tests.** Playwright tests run with `bun run test:e2e` against the dev server with AI providers and climate lookups disabled through environment variables. They cover: completing the three planner steps to a starter plan; Shuffle Plants changing the plants; a plan-based chat answer; and the calendar download producing a `.ics` file.
5. **Verification.** Unit tests cover schema generation, request validation, and the stream event order. `bun run test`, `bun run lint`, `bun run build`, and `bun run test:e2e` pass.
