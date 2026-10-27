# FloraScape

FloraScape helps beginner gardeners turn a real growing space into an illustrated garden blueprint and planting guide. The planner combines user-provided dimensions and sunlight with real climate data and AI plant recommendations, then shows the result as a Collector's Album with an editable, animated pixel-art garden.

## Architecture

The application is written in strict TypeScript and intentionally separates probabilistic recommendations from deterministic data and layout code:

1. The planner validates the ZIP code, garden type, dimensions, sunlight, plant categories, and free-form preferences (capped at 500 characters).
2. The server looks up the ZIP's USDA hardiness zone (phzmapi.org), median frost dates and growing-season length (Open-Meteo history), and a 7-day frost forecast (Open-Meteo). Each lookup has a timeout and is optional.
3. That climate data is injected into the prompt as authoritative context. The AI recommends plant groups, placement reasons, per-area alternatives, care tips, and planting-guide content using a structured response schema.
4. Server-side code validates the response and owns all bed geometry. Model-generated coordinates are never trusted or rendered. Plant spacing is clamped to ranges from the curated plant-facts file.
5. The layout engine allocates plant zones, tops up thin areas, and fills every zone to its spacing capacity so no growing space is left empty.
6. The pixel garden draws each bed as one-foot soil tiles with animated plant sprites, while regular React controls handle editing and accessibility.

### Code layout

| Path | Responsibility |
|---|---|
| `lib/plan/` | Response schema, prompt, normalization, starter plan, and fill/alternatives/swap/shuffle logic |
| `lib/garden-plan.ts` | Re-exports `lib/plan/*` |
| `lib/types.ts` | Shared domain types; AI response types are inferred from the Zod schemas |
| `lib/garden-layout.ts` | Zone allocation and SVG model |
| `lib/climate.ts` | Zone, frost-date, and forecast lookups with an in-memory cache |
| `lib/plant-facts.json` | Spacing, maturity, sun, frost tolerance, category, easy-care flag, direct-sow vs. transplant, botanical family, and rotation group for common plants |
| `lib/companions.json` | Curated helpful and conflicting plant pairs with reasons |
| `lib/ai/` | Gemini and OpenAI-compatible providers, the fallback chain, and the TTL caches |
| `lib/chat/` | Garden chat: plan-based answers, plan summary, prompt, swap filtering, and rate limit |

## Local setup

1. Install dependencies with `bun install`.
2. Copy `.env.example` to `.env.local` and configure at least one AI provider.
3. Run `bun run dev`.

```bash
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-3.6-flash

# Optional fallbacks (OpenAI-compatible); both variables are required for each
GROQ_API_KEY=
GROQ_MODEL=
OPENROUTER_API_KEY=
OPENROUTER_MODEL=
```

Providers are tried in order: Gemini, Groq, then OpenRouter. With none configured, the planner returns a local starter plan.

## Planner behavior

- The planner has three steps (Location & type, Your space, What to grow) with a progress indicator; Next checks only the current step, and finished steps can be revisited.
- In-ground gardens collect total dimensions, the sunniest side (picked on a compass around the plot), and an optional section count.
- Raised beds and containers use repeatable dimension and sunlight cards.
- “Any” lets the AI recommend in-ground planting, raised beds, or containers from the available areas and preferences.
- Free-form preferences are treated as user intent, including named plants and requests for troubleshooting help.
- A live, to-scale preview of the entered plot, beds, or containers updates as dimensions change.

## Results and editing

- A badge shows where the plan came from: an AI provider, the starter plan, or a saved (cached) result.
- Results open as a **Collector's Album**: one trading card per plant (difficulty, spacing, days to harvest, sun, what to buy) with Planted / Growing / Harvested stamps saved on this device, a season map, and a home-turf frost card.
- **The bed these cards fill** is the garden editor: an animated pixel garden (20 plant sprites in `public/sprites/`, look-alikes for the other plants) with plant dropdowns, +/− counts, add-a-group, and a table view.
- The results page shows the hardiness zone, frost dates, growing-season length, and a frost warning when frost is forecast.
- Every zone is filled to the number of plants its size and spacing allow; areas of 8 sq ft or more get at least three plant groups.
- Toggle **View as table** for an accessible table of each group's area, quantity, spacing, and allocated size.
- Click a patch to jump to its planting guide, or drag one patch onto another (mouse or pen) to swap them, within a bed or across beds; both areas refill to capacity.
- Hover a garden patch to see its quantity, what to buy, spacing, allocated size, and placement reason.
- Select a zone to jump to its planting-guide entry.
- Use a group's plant dropdown to swap in one of that area's alternatives (suited to its sun, your categories, preferences, and the season). The new plant takes over the same zone at its own spacing.
- Use **Shuffle Plants** to swap every area's plants for different alternatives instantly, without another AI call.
- Use the +/− controls to rebalance or remove plant groups, or add another recommended group to a growing area.
- Use Edit Inputs to change bed or container geometry and regenerate the plan.
- The planting guide is grouped into Plant now, Plant next month, and Plant later, with plant counts.
- **Add to calendar** downloads an `.ics` file with a sowing or planting date for each plant (from frost dates and frost tolerance) and the date its harvest window opens.
- The **Neighbor check** lists commonly recommended pairings and conflicts among plants sharing an area, from the curated `lib/companions.json` table.
- The **Shopping list** shows seeds to sow (with a germination buffer) or nursery starts to buy, plus soil-mix and compost volumes per area with an estimated bag count.
- **Crop rotation**: save each season's plan on this device (up to 8, in `localStorage`). The next plan is checked against the most recent other season, area by area (matched by name), and flags crops returning to the same rotation group (fruiting → legume → leafy → root). Each flagged area recommends the next group and offers one-click swaps from its alternatives.
- **Ask about my garden** answers follow-up questions. "When / how far apart / how many" questions about a plant in the guide are answered straight from the plan with no AI call; other questions go to the same AI providers with a compact plan summary, and suggested swaps appear as one-click buttons. Replies are cached for an hour, each client is limited to 20 AI questions per 10 minutes, and the chat shows a friendly notice when no provider is available.
- Print the album, garden, planting guide, tips, neighbor check, and shopping list as a compact landscape plan.

Planner state is stored in `sessionStorage`, and saved seasons for crop rotation are stored in `localStorage` on this device only; there are no accounts.

## Reliability

- AI responses use a JSON response schema and semantic validation.
- Each provider gets one retry for a 429, 5xx, or invalid response; other errors move straight to the next provider.
- If every provider fails, or none is configured, the server creates a local starter plan from the submitted dimensions, still filled and with alternatives.
- Successful plans are cached in memory for one hour per normalized input.
- If a climate source fails, generation continues without it.
- Gardening recommendations still require local judgment and seed-packet instructions; frost dates are historical medians, not guarantees.

## Verification

```bash
bun run test
bun run lint
bun run typecheck
bun run build
bun run test:e2e
```

`bun run test:e2e` runs the Playwright browser tests. It starts its own dev server on port 3100 with `FLORASCAPE_AI=off` and `FLORASCAPE_CLIMATE=off`, so every plan is the offline starter plan. To test a server that is already running, start it with `bun run dev:e2e` and set `E2E_BASE_URL=http://localhost:3100`.

The plan route streams progress as newline-delimited JSON when the request sends `Accept: application/x-ndjson`; the loading screen shows each stage. Response schemas sent to AI providers are generated from the Zod schemas in `lib/schemas/`, which also validate API request bodies.

Specs and audit records live in `docs/` and `AUDIT.md`.
