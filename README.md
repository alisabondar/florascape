# FloraScape

FloraScape helps beginner gardeners turn the dimensions, sunlight, location, and goals for an outdoor space into an illustrated garden blueprint and practical planting guide.

## Local setup

1. Install dependencies with `bun install`.
2. Create `.env.local` in the project root.
3. Add:

```bash
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-3.6-flash
```

4. Run `bun run dev`.

## Planner flow

- In-ground gardens collect the total dimensions, sunniest side, and whether the plot should remain continuous or be divided into sections.
- Raised beds and containers use repeatable cards. Each card represents one growing area with its own dimensions and sun exposure.
- Gemini returns a structured plan containing the garden description, plant placement, placement reasons, tips, and general planting guide.
- Server-side geometry makes the submitted number and dimensions of growing areas authoritative before rendering.
- Rough.js renders the validated plan as an interactive sketch with `roughness: 0.5`.

## Results and editing

- Hover a plant area for its placement reason.
- Click a plant area to jump to its planting-guide entry.
- Drag plant groups, copy/paste them, add another recommended group, delete a selected group, or reset the layout.
- Bed/container geometry changes are made by editing planner inputs and regenerating the plan.
- The print action includes the sketch, tips, container setup guidance when applicable, and planting guide.

## Validation

Run a production compile with:

```bash
bun run build
```

If Gemini is unavailable or returns invalid data, FloraScape can construct a dimensionally accurate starter plan from the submitted inputs.
