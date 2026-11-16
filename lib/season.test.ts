import { describe, expect, test } from "bun:test";
import { followUpOptions, monthTasks, patchState, plantSeason, seasonStage, seasonTimeline, seedSavingTip, startingMonth } from "./season";
import type { ClimateContext } from "./types";

const climate: ClimateContext = {
  hardinessZone: "6a",
  temperatureRange: null,
  frost: { lastSpringFrost: "04-25", firstFallFrost: "10-10", growingSeasonDays: 168, yearsAnalyzed: 10 },
  forecast: null,
};

describe("plantSeason", () => {
  test("tender plants go in after the last frost and produce until fall frost", () => {
    const tomato = plantSeason({ id: "t", name: "Tomato" }, climate);
    expect(tomato.plantMonth).toBe(4); // May
    expect(tomato.harvestMonth).toBe(6); // Jul (70 days)
    expect(tomato.endMonth).toBe(9); // Oct frost
  });

  test("hardy leafy crops go in early and finish after a few weeks of picking", () => {
    const spinach = plantSeason({ id: "s", name: "Spinach" }, climate);
    expect(spinach.plantMonth).toBe(2); // Mar, six weeks before frost
    expect(spinach.endMonth).toBeLessThan(6);
  });

  test("works without climate data", () => {
    const season = plantSeason({ id: "b", name: "Basil" }, null);
    expect(season.plantMonth).toBeGreaterThanOrEqual(3);
    expect(season.endMonth).toBeGreaterThan(season.harvestMonth);
  });
});

describe("seasonStage", () => {
  const season = { plantId: "x", plantMonth: 4, harvestMonth: 6, endMonth: 8 };
  test("walks empty → planted → growing → harvest → done", () => {
    expect([3, 4, 5, 6, 8, 9].map((month) => seasonStage(season, month))).toEqual([
      "empty", "planted", "growing", "harvest", "harvest", "done",
    ]);
  });
});

describe("seasonTimeline", () => {
  const layout = { plants: [{ id: "t", name: "Tomato" }, { id: "s", name: "Spinach" }] as never };
  test("spans first planting to the month after the last harvest", () => {
    const timeline = seasonTimeline(layout, climate);
    expect(timeline.months[0]).toBe(2);
    expect(timeline.months.at(-1)).toBe(10);
  });

  test("opens on this month when it's in season", () => {
    const timeline = seasonTimeline(layout, climate);
    expect(startingMonth(timeline, new Date(2026, 5, 10))).toBe(5);
    expect(startingMonth(timeline, new Date(2026, 0, 10))).toBe(2);
    // November: everything is finished, so open on the first planting month instead.
    expect(startingMonth(timeline, new Date(2026, 10, 10))).toBe(2);
  });

  test("lists what to plant, pick, and where space is free", () => {
    const timeline = seasonTimeline(layout, climate);
    expect(monthTasks(layout, timeline, 4).plant).toEqual(["Tomato"]);
    expect(monthTasks(layout, timeline, 7).free).toEqual(["Spinach"]);
  });
});

describe("follow-up crops", () => {
  const lettuce = { id: "l", name: "Leaf Lettuce", spacingInches: 12, quantity: 6 };

  test("offers crops that still mature before fall frost, from another family, quickest first", () => {
    const timeline = seasonTimeline({ plants: [lettuce] } as never, climate);
    const options = followUpOptions(lettuce, timeline, climate, "full_sun");
    expect(options.length).toBeGreaterThan(0);
    expect(options.map((option) => option.name)).not.toContain("Romaine Lettuce");
    const days = options.map((option) => option.daysToMaturity);
    expect(days).toEqual([...days].sort((a, b) => a - b));
  });

  test("a shady bed gets no full-sun crops", () => {
    const timeline = seasonTimeline({ plants: [lettuce] } as never, climate);
    const sunny = followUpOptions(lettuce, timeline, climate, "full_sun", 50).map((option) => option.name);
    const shady = followUpOptions(lettuce, timeline, climate, "shade", 50).map((option) => option.name);
    expect(shady.length).toBeLessThan(sunny.length);
  });

  test("the zone switches to the follow-up once it's sown", () => {
    const withNext = { ...lettuce, followUp: { name: "Bush Bean", spacingInches: 6, quantity: 20 } };
    const timeline = seasonTimeline({ plants: [withNext] } as never, climate);
    const first = timeline.byPlant.get("l")!;
    const sown = first.endMonth + 1;
    expect(patchState(withNext, timeline, first.endMonth)).toMatchObject({ name: "Leaf Lettuce", followUp: false });
    expect(patchState(withNext, timeline, sown)).toMatchObject({ name: "Bush Bean", stage: "planted", followUp: true });
    expect(monthTasks({ plants: [withNext] } as never, timeline, sown).plant).toEqual(["Bush Bean"]);
  });
});

describe("seedSavingTip", () => {
  test("two-year crops wait a year; annuals and fruit can be saved now", () => {
    expect(seedSavingTip("Carrot").canSaveNow).toBe(false);
    expect(seedSavingTip("Leaf Lettuce").canSaveNow).toBe(true);
    expect(seedSavingTip("Tomato").tip).toContain("ripe fruit");
  });
});
