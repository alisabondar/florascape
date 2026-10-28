# Spec Audit — docs/V2-PHASE7.md

Source document: `docs/V2-PHASE7.md`. Scope: steps 1–6.

## Checklist

1. S1: "Each plant-facts entry records its botanical family and a rotation group" with the stated group values and family mapping
2. S2: "a "Save this season" button that stores the current plan's areas and plants, with a season label (such as "Fall 2026") and the ZIP code, in `localStorage`"
3. S2: "At most 8 seasons are kept, newest first."
4. S2: "Saved seasons are listed with their label, area count, and a remove button."
5. S3: "When at least one saved season exists other than the current plan, the result page compares the current plan to the most recent such season."
6. S3: "For each growing area matched by name, it lists current plants whose rotation group (other than "none") also grew in that area that season, naming the earlier plant."
7. S4: "recommends the next rotation group in the order fruiting → legume → leafy → root → fruiting, after the group grown there last season"
8. S4: "offers up to 3 swap buttons that replace a repeating plant with an area alternative from the recommended group, using the same swap logic as the editor dropdown"
9. S5: "updates when plants are edited, swapped, or shuffled, and when seasons are saved or removed"
10. S6: "Unit tests cover family and group data, saving and trimming seasons, matching areas, repeat detection, the next-group order, and swap suggestions."
11. S6: "`bun run test`, `bun run lint`, and `bun run build` pass"

## Round 1

Auditor: fresh subagent. Result: **11/11 MET**. `bun run test` 64 pass / 0 fail; `bun run lint` clean; `bun run build` succeeded. Manual browser run: saved a season to `localStorage`, simulated a new plan, saw repeats flagged for both beds with the next rotation group, and a suggested swap (Tomato → Pea) cleared Bed 1's warning.

### Findings
None.

### Out-of-scope (not traceable to the spec; not acted on)
- Re-saving the same plan replaces its entry; the button then reads "Update saved season".
- Last season's group is the most common group in the area (ties in rotation order).
- December is labeled as the following year's winter.

## Result
Stopped after round 1: zero PARTIAL/MISSING. Scope-creep breaker did not fire.
