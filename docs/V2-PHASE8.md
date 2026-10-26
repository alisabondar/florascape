# V2 Phase 8 — Planner and sketch interactions

Goal: make the planner easier to fill in and the sketch easier to rearrange and inspect, with no new dependencies.

## Steps

1. **Step-by-step planner.** The planner form is split into three steps — "Location & type" (ZIP code, garden type), "Your space" (dimensions, sunlight, and the live area preview), and "What to grow" (plant categories, preferences) — with a progress indicator showing "Step N of 3" and the step names. Next validates only the current step's fields and shows their errors; Back keeps entered values. Completed steps can be revisited from the progress indicator. The last step's button generates the plan.
2. **Sun-side picker.** For in-ground plots, the sunniest-side dropdown is replaced by a compass picker: a plot outline with North, East, South, and West buttons on its sides plus a "Whole plot is shaded" option. It works as a single-choice radio group (one selected, arrow keys move the selection) and shows a hint that in the Northern Hemisphere the south side usually gets the most sun.
3. **Drag to swap zones.** In the sketch, dragging one plant zone onto another swaps the two groups' places — within a bed they trade positions and space, across beds they trade beds — and both areas are refilled to capacity and the planting guide updates. A press without movement still opens the plant's guide entry.
4. **Zoom and pan.** The sketch has zoom in, zoom out, and reset controls, supports pinch-to-zoom on touch screens and Ctrl/⌘ + scroll on desktop, and zooms between 1× and 3×. When zoomed in, dragging an empty part of the sketch pans it, within the sketch's bounds. Printing always shows the sketch unzoomed.
5. **Tests.** Unit tests cover per-step validation, the zone swap, and the zoom and pan math. `bun run test`, `bun run lint`, and `bun run build` pass.

## Revision (2026-10-26)

At the owner's request, step 2's picker changed: four side buttons (North, East, South, West) plus "Whole plot is shaded". Selecting two adjacent sides makes a corner, shown as e.g. "Southwest"; the stored value is a single string such as `southwest`. The buttons are toggle buttons (`aria-pressed`) rather than a radio group, so step 2's arrow-key radio behavior no longer applies.
