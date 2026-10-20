# Spec Audit — docs/V2-PHASE4.md

Source document: `docs/V2-PHASE4.md`. Scope: steps 1–6.

## Checklist

1. S1: "groups its entries under "Plant now", "Plant next month", and "Plant later" headings, in that order"
2. S1: "each showing how many plants are in the group"
3. S1: "Empty groups are not shown."
4. S2: ""AI plan" with the provider name"
5. S2: ""Starter plan" when the fallback was used"
6. S2: ""Saved result" when the response came from the plan cache"
7. S3: "a "Show 1 ft grid" toggle that draws 1-foot grid lines inside every growing area"
8. S3: "The grid is off by default and is not printed."
9. S4: "A "View as table" toggle shows the layout as an HTML table with columns for growing area, plant, quantity, spacing (inches), and allocated size (feet)"
10. S4: "The table updates when plants are edited, swapped, or shuffled."
11. S5: "shows a scaled preview of the entered growing areas (in-ground plot, or each raised bed/container)"
12. S5: "updates as dimensions change"
13. S5: "labeled with each area's dimensions in feet"
14. S6: "Unit tests cover guide grouping and the table rows."
15. S6: "`bun run test`, `bun run lint`, and `bun run build` pass"
