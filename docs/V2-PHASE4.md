# V2 Phase 4 — UI improvements

Goal: make the plan easier to act on and understand, with no new dependencies.

## Steps

1. **Guide by timing.** The planting guide groups its entries under "Plant now", "Plant next month", and "Plant later" headings, in that order, each showing how many plants are in the group. Empty groups are not shown.
2. **Plan source badge.** The result page shows a badge stating where the plan came from: "AI plan" with the provider name, "Starter plan" when the fallback was used, and "Saved result" when the response came from the plan cache.
3. **Square-foot grid.** The sketch has a "Show 1 ft grid" toggle that draws 1-foot grid lines inside every growing area. The grid is off by default and is not printed.
4. **Table view.** A "View as table" toggle shows the layout as an HTML table with columns for growing area, plant, quantity, spacing (inches), and allocated size (feet). The table updates when plants are edited, swapped, or shuffled.
5. **Live area preview.** The planner form shows a scaled preview of the entered growing areas (in-ground plot, or each raised bed/container) that updates as dimensions change, labeled with each area's dimensions in feet.
6. **Tests.** Unit tests cover guide grouping and the table rows. `bun run test`, `bun run lint`, and `bun run build` pass.
