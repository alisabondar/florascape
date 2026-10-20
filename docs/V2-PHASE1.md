# V2 Phase 1 — Ground the AI in real data

Goal: replace model guesses about climate and plant facts with deterministic data, injected into the prompt as authoritative context and used to validate model output.

## Steps

1. **Hardiness zone.** The server resolves the submitted ZIP code to a USDA hardiness zone and coordinates using phzmapi.org (`https://phzmapi.org/{zip}.json`).
2. **Frost dates and season length.** Using those coordinates, the server computes the median last spring frost date, median first fall frost date, and growing-season length in days from Open-Meteo historical daily minimum temperatures (frost = daily minimum ≤ 0 °C), over at least the 5 most recent complete years.
3. **Forecast.** The server fetches a 7-day daily forecast (min/max temperature) from Open-Meteo and flags any forecast frost day.
4. **Plant facts.** A curated plant-facts JSON file in `lib/` provides, per plant, recommended spacing in inches (min and max), days to maturity, sun needs, and frost tolerance. It covers at least 30 common beginner plants, including every plant used by the fallback plan.
5. **Authoritative prompt context.** The zone, frost dates, season length, and forecast frost warning are injected into the Gemini prompt as authoritative climate context, and the prompt instructs the model to use them instead of inferring climate from the ZIP code.
6. **Spacing validation.** When a recommended plant matches the plant-facts file (case-insensitive name or alias), its spacing is clamped to the file's min/max range before layout.
7. **Graceful degradation.** Each data source has a request timeout; if any source fails, plan generation still succeeds without that context. Climate lookups are cached in memory per ZIP.
8. **Visible to the user.** The result page shows the hardiness zone, frost dates, and season length when available, and a frost warning when the forecast includes a frost day.
9. **Tests.** Unit tests cover frost-date computation, spacing clamping, and the fallback when a data source fails. `bun run test`, `bun run lint`, and `bun run build` pass.
