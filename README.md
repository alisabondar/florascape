# FloraScape

FloraScape helps beginner gardeners turn a real growing space into an illustrated garden blueprint and planting guide. The planner combines user-provided dimensions and sunlight with real climate data and AI plant recommendations, then renders the result as an editable Rough.js sketch.

## Architecture

The application intentionally separates probabilistic recommendations from deterministic data and layout code:

1. The planner validates the ZIP code, garden type, dimensions, sunlight, plant categories, and free-form preferences (capped at 500 characters).
2. The server looks up the ZIP's USDA hardiness zone (phzmapi.org), median frost dates and growing-season length (Open-Meteo history), and a 7-day frost forecast (Open-Meteo). Each lookup has a timeout and is optional.
3. That climate data is injected into the prompt as authoritative context. The AI recommends plant groups, placement reasons, per-area alternatives, care tips, and planting-guide content using a structured response schema.
4. Server-side code validates the response and owns all bed geometry. Model-generated coordinates are never trusted or rendered. Plant spacing is clamped to ranges from the curated plant-facts file.
5. The layout engine allocates plant zones, tops up thin areas, and fills every zone to its spacing capacity so no growing space is left empty.
6. Rough.js draws the blueprint, while regular React controls handle editing and accessibility.

### Code layout

| Path | Responsibility |
|---|---|
| `lib/plan/` | Response schema, prompt, normalization, starter plan, and fill/alternatives/swap/shuffle logic |
| `lib/garden-plan.js` | Re-exports `lib/plan/*` |
| `lib/garden-layout.js` | Zone allocation and SVG model |
| `lib/climate.js` | Zone, frost-date, and forecast lookups with an in-memory cache |
| `lib/plant-facts.json` | Spacing, maturity, sun, frost tolerance, category, and easy-care flag for common plants |
| `lib/ai/` | Gemini and OpenAI-compatible providers, the fallback chain, and the plan cache |

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

- In-ground gardens collect total dimensions, the sunniest side, and an optional section count.
- Raised beds and containers use repeatable dimension and sunlight cards.
- “Any” lets the AI recommend in-ground planting, raised beds, or containers from the available areas and preferences.
- Free-form preferences are treated as user intent, including named plants and requests for troubleshooting help.

## Results and editing

- The results page shows the hardiness zone, frost dates, growing-season length, and a frost warning when frost is forecast.
- Every zone is filled to the number of plants its size and spacing allow; areas of 8 sq ft or more get at least three plant groups.
- Hover or focus a plant zone to see its quantity, spacing, allocated size, and placement reason.
- Select a zone to jump to its planting-guide entry.
- Use a group's plant dropdown to swap in one of that area's alternatives (suited to its sun, your categories, preferences, and the season). The new plant takes over the same zone at its own spacing.
- Use **Shuffle Plants** to swap every area's plants for different alternatives instantly, without another AI call.
- Use the +/− controls to rebalance or remove plant groups, or add another recommended group to a growing area.
- Use Edit Inputs to change bed or container geometry and regenerate the plan.
- Print the sketch, planting guide, and tips as a compact landscape plan.

Planner state is stored in `sessionStorage`; accounts and persistent saved gardens are outside the current scope.

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
bun run build
```

Specs and audit records live in `docs/` and `AUDIT.md`.
