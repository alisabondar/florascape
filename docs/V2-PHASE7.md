# V2 Phase 7 — Crop rotation

Goal: remember what grew where in past seasons on this device, and steer each growing area toward a different crop family next season. Deterministic only; no AI calls and no accounts.

## Steps

1. **Plant families.** Each plant-facts entry records its botanical family and a rotation group: "fruiting" (Solanaceae, Cucurbitaceae), "legume" (Fabaceae), "leafy" (Brassicaceae, Amaranthaceae, and lettuce), "root" (Apiaceae, Amaryllidaceae, beets), or "none" for herbs, flowers, and perennials that are not rotated.
2. **Save a season.** The result page has a "Save this season" button that stores the current plan's areas and plants, with a season label (such as "Fall 2026") and the ZIP code, in `localStorage`. At most 8 seasons are kept, newest first. Saved seasons are listed with their label, area count, and a remove button.
3. **Rotation check.** When at least one saved season exists other than the current plan, the result page compares the current plan to the most recent such season. For each growing area matched by name, it lists current plants whose rotation group (other than "none") also grew in that area that season, naming the earlier plant.
4. **Next-group suggestion.** For each area with a repeat, the check recommends the next rotation group in the order fruiting → legume → leafy → root → fruiting, after the group grown there last season, and offers up to 3 swap buttons that replace a repeating plant with an area alternative from the recommended group, using the same swap logic as the editor dropdown.
5. **Updates.** The rotation check updates when plants are edited, swapped, or shuffled, and when seasons are saved or removed.
6. **Tests.** Unit tests cover family and group data, saving and trimming seasons, matching areas, repeat detection, the next-group order, and swap suggestions. `bun run test`, `bun run lint`, and `bun run build` pass.
