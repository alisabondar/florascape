# V2 Phase 5 — Calendar, shopping list, and neighbor check

Goal: turn the plan into dated tasks, a buying list, and deterministic planting-neighbor advice. No new dependencies or backend.

## Steps

1. **Calendar export.** The result page has an "Add to calendar" button that downloads a `.ics` file with one all-day sowing/planting event per plant in the guide and one harvest-window event per plant with known days to maturity. Sowing dates come from the plant's frost tolerance and the climate frost dates when available, and from the guide's planting window otherwise. Events are never dated in the past.
2. **Valid iCalendar.** The file follows RFC 5545: CRLF line endings, `VCALENDAR` with `VERSION:2.0` and `PRODID`, and each `VEVENT` has a unique `UID`, `DTSTAMP`, `DTSTART;VALUE=DATE`, and `SUMMARY`, with text values escaped.
3. **Shopping list.** The result page shows a shopping list with, per plant: seeds to sow (target quantity plus a germination buffer) for direct-sown plants, or nursery starts to buy for transplanted plants. Each plant-facts entry records whether it is usually direct-sown or transplanted.
4. **Soil and compost.** The shopping list shows, per growing area: soil-mix volume for raised beds and containers (area × 1 ft depth) with the compost share, or a 2-inch compost top-dressing volume for in-ground areas; volumes in cubic feet, and totals with an estimated count of 1.5 cu ft bags. The assumptions are stated on the page.
5. **Neighbor check.** A curated companion table in `lib/` lists plant pairs as helpful or conflicting, each with a reason. The result page shows, for each growing area, the helpful pairs and conflicts among the plants in that area, using cautious wording. It updates when plants are edited, swapped, or shuffled.
6. **Updates and print.** The shopping list and neighbor check reflect the current layout after edits, swaps, and shuffles, and both are included when the plan is printed.
7. **Tests.** Unit tests cover sowing-date calculation, the `.ics` output format, seed and start counts, soil volumes, and neighbor detection. `bun run test`, `bun run lint`, and `bun run build` pass.
