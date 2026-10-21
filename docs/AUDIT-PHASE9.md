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

## Round 1

Auditor: fresh subagent. Result: **10 MET, 1 PARTIAL**. `bun run test` 83 pass / 0 fail; `bun run build` succeeded; `bun run test:e2e` 4 passed in the user's terminal, both with `E2E_BASE_URL` and with Playwright starting `bun run dev:e2e` itself (the sandbox blocks port binding and Chromium).

### Findings
- Item 11 (PARTIAL): `bun run lint` crashes — `Failed to load plugin '@typescript-eslint' ... reading 'Cjs'`. Cause: the installed `typescript@7.0.2` has no JavaScript API, which `@typescript-eslint` (loaded by `eslint-config-next`) requires. Needs a dependency change (TypeScript 5.x), not application code. Reproduced in the user's terminal too.

### Out-of-scope (not traceable to the spec; not acted on)
- Non-Zod 400s ("Invalid request body.", "Valid planner input is required.") don't name fields.
- The stream also has an `error` event, and cached plans report provider "cache".

## Result
Blocked on item 11 pending a TypeScript 5.x install; everything buildable in code is MET. Scope-creep breaker did not fire.

## Round 2

After `typescript@5` (5.9.3) replaced 7.0.2: `bun run lint` clean (first lint of the phase 9 code, no findings), `bun run test` 83 pass, `bun run build` succeeded, `bun run test:e2e` 4 passed in the user's terminal. Item 11 now **MET** → **11/11 MET**.

## Result
Stopped after round 2: zero PARTIAL/MISSING. Scope-creep breaker did not fire.
