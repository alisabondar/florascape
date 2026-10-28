import { describe, expect, test } from "bun:test";
import { PLANT_FACTS } from "../plant-facts";
import {
  addSeason,
  MAX_SAVED_SEASONS,
  nextRotationGroup,
  previousSeason,
  removeSeason,
  rotationCheck,
  seasonLabel,
  snapshotSeason,
} from "./rotation";
import type { GardenPlan, RotationGroup, SavedSeason } from "../types";

const plan = {
  layout: {
    beds: [
      { id: "bed-1", name: "Bed 1" },
      { id: "bed-2", name: "Bed 2" },
      { id: "bed-3", name: "Bed 3" },
    ],
    plants: [
      { id: "p1", name: "Cherry Tomato", bedId: "bed-1" },
      { id: "p2", name: "Basil", bedId: "bed-1" },
      { id: "p3", name: "Zucchini", bedId: "bed-1" },
      { id: "p4", name: "Kale", bedId: "bed-2" },
      { id: "p5", name: "Pea", bedId: "bed-3" },
    ],
  },
  alternatives: {
    "bed-1": [{ name: "Marigold" }, { name: "Bush Bean" }, { name: "Pole Bean" }, { name: "Spinach" }],
    "bed-2": [{ name: "Carrot" }],
    "bed-3": [],
  },
} as unknown as GardenPlan;

const lastSeason = {
  id: "season-old",
  planId: "plan-old",
  label: "Summer 2026",
  areas: [
    { name: "Bed 1", plants: [{ name: "Eggplant", rotationGroup: "fruiting" }, { name: "Marigold", rotationGroup: "none" }] },
    { name: "Bed 2", plants: [{ name: "Garlic", rotationGroup: "root" }] },
    { name: "Bed 3", plants: [{ name: "Thyme", rotationGroup: "none" }] },
  ],
} as unknown as SavedSeason;

describe("family and group data", () => {
  test("every plant has a family and a known rotation group", () => {
    PLANT_FACTS.forEach((fact) => {
      expect(fact.family).toMatch(/aceae$/);
      expect(["fruiting", "legume", "leafy", "root", "none"]).toContain(fact.rotationGroup);
    });
    const group = (name: string) => PLANT_FACTS.find((fact) => fact.name === name)!.rotationGroup;
    expect([group("Tomato"), group("Cucumber"), group("Pea"), group("Kale"), group("Carrot"), group("Basil")]).toEqual([
      "fruiting",
      "fruiting",
      "legume",
      "leafy",
      "root",
      "none",
    ]);
  });
});

describe("season history", () => {
  test("labels seasons and snapshots areas with plant groups", () => {
    expect(seasonLabel(new Date(2026, 9, 20))).toBe("Fall 2026");
    expect(seasonLabel(new Date(2026, 11, 5))).toBe("Winter 2027");
    const season = snapshotSeason({ plan, planId: "plan-now", zipCode: "80205", now: new Date(2026, 9, 20) });
    expect(season).toMatchObject({ planId: "plan-now", label: "Fall 2026", zipCode: "80205" });
    expect(season.areas[0].plants[0]).toEqual({ name: "Cherry Tomato", family: "Solanaceae", rotationGroup: "fruiting" });
  });

  test("keeps newest first, at most eight, replaces re-saved plans, and removes by id", () => {
    let history: SavedSeason[] = [];
    for (let index = 0; index < 10; index += 1) {
      history = addSeason(history, { id: `s${index}`, planId: `plan-${index}`, areas: [] } as unknown as SavedSeason);
    }
    expect(history).toHaveLength(MAX_SAVED_SEASONS);
    expect(history[0].id).toBe("s9");
    expect(history.at(-1)!.id).toBe("s2");

    history = addSeason(history, { id: "s9b", planId: "plan-9", areas: [] } as unknown as SavedSeason);
    expect(history.filter((entry) => entry.planId === "plan-9").map((entry) => entry.id)).toEqual(["s9b"]);
    expect(removeSeason(history, "s9b").some((entry) => entry.id === "s9b")).toBe(false);
  });

  test("compares against the most recent season that is not the current plan", () => {
    const history = [
      { id: "a", planId: "current" },
      { id: "b", planId: "older" },
      { id: "c", planId: "oldest" },
    ] as SavedSeason[];
    expect(previousSeason(history, "current")!.id).toBe("b");
    expect(previousSeason([{ id: "a", planId: "current" } as SavedSeason], "current")).toBeNull();
  });
});

describe("rotation check", () => {
  test("follows fruiting → legume → leafy → root → fruiting", () => {
    expect((["fruiting", "legume", "leafy", "root"] as RotationGroup[]).map((group) => nextRotationGroup(group))).toEqual(["legume", "leafy", "root", "fruiting"]);
    expect(nextRotationGroup("none")).toBeNull();
  });

  test("finds repeats by area name, ignores 'none', and suggests swaps toward the next group", () => {
    const result = rotationCheck(plan, lastSeason);
    expect(result).toHaveLength(1);
    const [bed1] = result;
    expect(bed1.repeats).toEqual([
      { plantId: "p1", plant: "Cherry Tomato", group: "fruiting", earlierPlant: "Eggplant" },
      { plantId: "p3", plant: "Zucchini", group: "fruiting", earlierPlant: "Eggplant" },
    ]);
    expect(bed1).toMatchObject({ lastGroup: "fruiting", recommendedGroup: "legume" });
    expect(bed1.suggestions).toEqual([
      { plantId: "p1", from: "Cherry Tomato", replacement: "Bush Bean" },
      { plantId: "p3", from: "Zucchini", replacement: "Pole Bean" },
    ]);
  });

  test("skips areas without a same-named earlier area", () => {
    const renamed: SavedSeason = {
      ...lastSeason,
      areas: [{ name: "Old Bed", plants: [{ name: "Tomato", family: "Solanaceae", rotationGroup: "fruiting" }] }],
    };
    expect(rotationCheck(plan, renamed)).toEqual([]);
  });
});
