# Spec Audit — README.md

Source document: `README.md` (commit 61ab2ff). Scope: all requirement statements.

## Checklist

1. Intro: "The planner combines user-provided dimensions and sunlight with Gemini plant recommendations"
2. Intro: "then renders the result as an editable Rough.js sketch"
3. Arch 1: "The planner validates the ZIP code, garden type, dimensions, sunlight, plant categories, and free-form preferences."
4. Arch 2: "Gemini recommends plant groups, quantities, placement reasons, care tips, and planting-guide content using a structured response schema."
5. Arch 3: "Server-side code validates the response and owns all bed geometry."
6. Arch 3: "Model-generated coordinates are never trusted or rendered."
7. Arch 4: "The layout engine allocates plant zones from mature quantity and spacing requirements."
8. Arch 5: "Rough.js draws the blueprint, while regular React controls handle editing and accessibility."
9. Setup: "Copy `.env.example` to `.env.local` and add a Gemini API key." (`.env.example` exists with `GEMINI_API_KEY`, `GEMINI_MODEL`)
10. Setup: "Run `bun run dev`." (dev script exists)
11. Planner: "In-ground gardens collect total dimensions, the sunniest side, and an optional section count."
12. Planner: "Raised beds and containers use repeatable dimension and sunlight cards."
13. Planner: "“Any” lets Gemini recommend in-ground planting, raised beds, or containers from the available areas and preferences."
14. Planner: "Free-form preferences are treated as user intent, including named plants and requests for troubleshooting help."
15. Results: "Hover or focus a plant zone to see its quantity, spacing, allocated size, and placement reason."
16. Results: "Select a zone to jump to its planting-guide entry."
17. Results: "Use the +/− controls to rebalance or remove plant groups"
18. Results: "or add another recommended group to a growing area."
19. Results: "Use Edit Inputs to change bed or container geometry and regenerate the plan."
20. Results: "Print the sketch, planting guide, and tips as a compact landscape plan."
21. Results: "Planner state is stored in `sessionStorage`"
22. Reliability: "Gemini responses use a JSON response schema and semantic validation."
23. Reliability: "Invalid or truncated responses are retried once."
24. Reliability: "If Gemini is unavailable, the server creates a local starter plan from the submitted dimensions."
25. Verification: "`bun run test`", "`bun run lint`", "`bun run build`" (scripts exist and pass)

## Round 1

Auditor: fresh subagent. Result: **25/25 MET**. `bun run test` 7 pass / 0 fail; `bun run lint` clean; `bun run build` succeeded.

### Findings
None.

### Out-of-scope (not traceable to README; not acted on)
- Missing `GEMINI_API_KEY` returns 500 rather than the local starter plan (`app/api/generate-garden-plan/route.js:27-32`).
- Non-retryable Gemini errors (400/403) are surfaced rather than falling back (`route.js:109`).
- Server doesn't whitelist `plantTypes` values (`lib/garden-plan.js:232`).
- With a custom `GEMINI_MODEL`, up to 4 total attempts across two models (each model still retried once).
- No length cap on free-form preferences.

## Result
Stopped after round 1: zero PARTIAL/MISSING. Scope-creep breaker did not fire.
