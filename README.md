# FloraScape

FloraScape helps beginner gardeners turn a real growing space into an illustrated garden blueprint and planting guide. The planner combines user-provided dimensions and sunlight with Gemini plant recommendations, then renders the result as an editable Rough.js sketch.

## Architecture

The application intentionally separates probabilistic recommendations from deterministic layout code:

1. The planner validates the ZIP code, garden type, dimensions, sunlight, plant categories, and free-form preferences.
2. Gemini recommends plant groups, quantities, placement reasons, care tips, and planting-guide content using a structured response schema.
3. Server-side code validates the response and owns all bed geometry. Model-generated coordinates are never trusted or rendered.
4. The layout engine allocates plant zones from mature quantity and spacing requirements.
5. Rough.js draws the blueprint, while regular React controls handle editing and accessibility.

This boundary keeps submitted dimensions authoritative and reduces malformed model output.

## Local setup

1. Install dependencies with `bun install`.
2. Copy `.env.example` to `.env.local` and add a Gemini API key.
3. Run `bun run dev`.

```bash
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-3.6-flash
```

## Planner behavior

- In-ground gardens collect total dimensions, the sunniest side, and an optional section count.
- Raised beds and containers use repeatable dimension and sunlight cards.
- “Any” lets Gemini recommend in-ground planting, raised beds, or containers from the available areas and preferences.
- Free-form preferences are treated as user intent, including named plants and requests for troubleshooting help.

## Results and editing

- Hover or focus a plant zone to see its quantity, spacing, allocated size, and placement reason.
- Select a zone to jump to its planting-guide entry.
- Use the +/− controls to rebalance or remove plant groups, or add another recommended group to a growing area.
- Use Edit Inputs to change bed or container geometry and regenerate the plan.
- Print the sketch, planting guide, and tips as a compact landscape plan.

Planner state is stored in `sessionStorage`; accounts and persistent saved gardens are outside the current MVP.

## Reliability

- Gemini responses use a JSON response schema and semantic validation.
- Invalid or truncated responses are retried once.
- If Gemini is unavailable, the server creates a local starter plan from the submitted dimensions.
- Gardening recommendations still require local judgment and seed-packet instructions; ZIP code alone cannot guarantee a precise frost date or microclimate.

## Verification

```bash
bun run test
bun run lint
bun run build
```
