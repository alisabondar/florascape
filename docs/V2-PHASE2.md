# V2 Phase 2 — Fuller gardens, plant choice, and a sturdier server

Goal: plans should use the available growing space, gardeners should be able to swap and shuffle plants without regenerating, and the generation route should be modular, multi-provider, and resilient.

## Steps

1. **Fill the space.** After layout, the server computes each plant zone's capacity from its allocated size and spacing (plants per row × rows at the plant's spacing) and raises each group's quantity to that capacity, so no zone is left under-planted. Quantities are never lowered below what the model returned unless they exceed capacity.
2. **Enough groups per area.** Every growing area of at least 8 sq ft receives at least 3 plant groups, and smaller areas at least 1. The prompt asks for this, and the server tops up any area that falls short using suitable plants from the plant-facts file.
3. **Plant alternatives.** For every growing area, the plan includes a list of at least 5 alternative plants suited to that area's sunlight, the selected plant categories, the gardener's preferences, and the current season. Alternatives come from the model when it supplies them and are completed from the plant-facts file (filtered by category, sun fit, and frost tolerance vs. the current frost forecast) when it does not.
4. **Per-section plant dropdown.** Each plant group in the result editor has a dropdown listing that area's alternatives. Choosing one replaces the group's plant, applies the new plant's spacing, recomputes capacity, and updates the planting guide.
5. **Shuffle.** A Shuffle button replaces the plants in every area with a different random selection from that area's alternatives without calling the AI, keeping each area full. The planting guide updates to match.
6. **Guide entries for swapped plants.** Plants that enter the plan through a swap or shuffle get a planting-guide entry built from the plant-facts file (spacing, days to maturity, and planting timing from frost tolerance and the climate frost dates when available).
7. **Plant categories.** Each plant-facts entry has a category matching the planner's plant categories (vegetables, herbs, flowers, medicinal), plus an easy-care flag.
8. **Split the plan module.** `lib/garden-plan.js` is split into separate modules for the response schema, prompt building, response normalization, and the fallback plan, re-exported from `lib/garden-plan.js` so existing imports keep working.
9. **Provider abstraction.** AI calls go through `lib/ai/`, with one module per provider: Gemini, plus an OpenAI-compatible provider usable with Groq or OpenRouter via environment variables. Providers are tried in order, and a 429, 5xx, or invalid response moves to the next provider before falling back to the starter plan. `.env.example` documents the new variables.
10. **Audit gaps.** A missing AI key returns the starter plan instead of a 500. A 400/403 from a provider moves to the next provider or the starter plan instead of surfacing an error. `plantTypes` are whitelisted on the server. Free-form preferences are capped at 500 characters.
11. **Plan cache.** Successful AI plans are cached in memory, keyed by a hash of the normalized planner input, for 1 hour. A cached response is returned without calling a provider.
12. **Tests.** Unit tests cover capacity fill, group top-up, alternatives, swap, shuffle, provider fallback order, and the plan cache. `bun run test`, `bun run lint`, and `bun run build` pass.

## Deferred to Phase 2b (needs new dependencies)

Zod schemas, TypeScript migration, streaming responses, and Playwright tests.
