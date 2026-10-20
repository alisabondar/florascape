# Spec Audit — docs/V2-PHASE5.md

Source document: `docs/V2-PHASE5.md`. Scope: steps 1–7.

## Checklist

1. S1: "an "Add to calendar" button that downloads a `.ics` file"
2. S1: "one all-day sowing/planting event per plant in the guide"
3. S1: "one harvest-window event per plant with known days to maturity"
4. S1: "Sowing dates come from the plant's frost tolerance and the climate frost dates when available, and from the guide's planting window otherwise."
5. S1: "Events are never dated in the past."
6. S2: "CRLF line endings, `VCALENDAR` with `VERSION:2.0` and `PRODID`"
7. S2: "each `VEVENT` has a unique `UID`, `DTSTAMP`, `DTSTART;VALUE=DATE`, and `SUMMARY`, with text values escaped"
8. S3: "per plant: seeds to sow (target quantity plus a germination buffer) for direct-sown plants, or nursery starts to buy for transplanted plants"
9. S3: "Each plant-facts entry records whether it is usually direct-sown or transplanted."
10. S4: "soil-mix volume for raised beds and containers (area × 1 ft depth) with the compost share"
11. S4: "a 2-inch compost top-dressing volume for in-ground areas"
12. S4: "volumes in cubic feet, and totals with an estimated count of 1.5 cu ft bags"
13. S4: "The assumptions are stated on the page."
14. S5: "A curated companion table in `lib/` lists plant pairs as helpful or conflicting, each with a reason."
15. S5: "for each growing area, the helpful pairs and conflicts among the plants in that area, using cautious wording"
16. S5: "It updates when plants are edited, swapped, or shuffled."
17. S6: "The shopping list and neighbor check reflect the current layout after edits, swaps, and shuffles"
18. S6: "both are included when the plan is printed"
19. S7: "Unit tests cover sowing-date calculation, the `.ics` output format, seed and start counts, soil volumes, and neighbor detection."
20. S7: "`bun run test`, `bun run lint`, and `bun run build` pass"
