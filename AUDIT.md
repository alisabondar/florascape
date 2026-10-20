# Spec Audit — docs/V2-PHASE1.md

Source document: `docs/V2-PHASE1.md`. Scope: steps 1–9.

## Checklist

1. S1: "resolves the submitted ZIP code to a USDA hardiness zone and coordinates using phzmapi.org"
2. S2: "computes the median last spring frost date, median first fall frost date, and growing-season length in days from Open-Meteo historical daily minimum temperatures"
3. S2: "(frost = daily minimum ≤ 0 °C)"
4. S2: "over at least the 5 most recent complete years"
5. S3: "fetches a 7-day daily forecast (min/max temperature) from Open-Meteo"
6. S3: "flags any forecast frost day"
7. S4: "A curated plant-facts JSON file in `lib/`"
8. S4: "per plant, recommended spacing in inches (min and max), days to maturity, sun needs, and frost tolerance"
9. S4: "covers at least 30 common beginner plants, including every plant used by the fallback plan"
10. S5: "zone, frost dates, season length, and forecast frost warning are injected into the Gemini prompt as authoritative climate context"
11. S5: "the prompt instructs the model to use them instead of inferring climate from the ZIP code"
12. S6: "matches the plant-facts file (case-insensitive name or alias), its spacing is clamped to the file's min/max range before layout"
13. S7: "Each data source has a request timeout"
14. S7: "if any source fails, plan generation still succeeds without that context"
15. S7: "Climate lookups are cached in memory per ZIP"
16. S8: "result page shows the hardiness zone, frost dates, and season length when available"
17. S8: "a frost warning when the forecast includes a frost day"
18. S9: "Unit tests cover frost-date computation, spacing clamping, and the fallback when a data source fails"
19. S9: "`bun run test`, `bun run lint`, and `bun run build` pass"

## Round 1

Auditor: fresh subagent. Result: **19/19 MET**. `bun run test` 17 pass / 0 fail; `bun run lint` clean; `bun run build` succeeded. Network blocked in sandbox; API integration judged from code.

### Findings
None.

### Out-of-scope (not traceable to the spec; not acted on)
- Climate cache has a 6-hour TTL (`lib/climate.js:2`).
- If the zone lookup fails, frost and forecast lookups are skipped (they need its coordinates).
- Container instructions still ask the model to infer a container type from the ZIP's climate (`lib/garden-plan.js:773`).

## Result
Stopped after round 1: zero PARTIAL/MISSING. Scope-creep breaker did not fire.
