# Spec Audit — docs/V2-PHASE8.md

Source document: `docs/V2-PHASE8.md`. Scope: steps 1–5.

## Checklist

1. S1: "three steps — "Location & type" (ZIP code, garden type), "Your space" (dimensions, sunlight, and the live area preview), and "What to grow" (plant categories, preferences)"
2. S1: "a progress indicator showing "Step N of 3" and the step names"
3. S1: "Next validates only the current step's fields and shows their errors; Back keeps entered values."
4. S1: "Completed steps can be revisited from the progress indicator. The last step's button generates the plan."
5. S2: "a compass picker: a plot outline with North, East, South, and West buttons on its sides plus a "Whole plot is shaded" option"
6. S2: "works as a single-choice radio group (one selected, arrow keys move the selection)"
7. S2: "shows a hint that in the Northern Hemisphere the south side usually gets the most sun"
8. S3: "dragging one plant zone onto another swaps the two groups' places — within a bed they trade positions and space, across beds they trade beds"
9. S3: "both areas are refilled to capacity and the planting guide updates"
10. S3: "A press without movement still opens the plant's guide entry."
11. S4: "zoom in, zoom out, and reset controls"
12. S4: "supports pinch-to-zoom on touch screens and Ctrl/⌘ + scroll on desktop, and zooms between 1× and 3×"
13. S4: "When zoomed in, dragging an empty part of the sketch pans it, within the sketch's bounds."
14. S4: "Printing always shows the sketch unzoomed."
15. S5: "Unit tests cover per-step validation, the zone swap, and the zoom and pan math."
16. S5: "`bun run test`, `bun run lint`, and `bun run build` pass"
