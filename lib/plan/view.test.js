import { describe, expect, test } from "bun:test";
import { groupGuideByTiming, layoutTableRows } from "./view";

describe("groupGuideByTiming", () => {
  test("orders groups now, next month, later, counts plants, and hides empty groups", () => {
    const groups = groupGuideByTiming([
      { plantName: "Kale", whenToPlant: "next_season", quantity: 4 },
      { plantName: "Pea", whenToPlant: "now", quantity: 10 },
      { plantName: "Radish", whenToPlant: "now", quantity: 5 },
      { plantName: "Removed", whenToPlant: "next_month", quantity: 0 },
    ]);
    expect(groups.map((group) => group.title)).toEqual(["Plant now", "Plant later"]);
    expect(groups[0].plantCount).toBe(15);
    expect(groups[0].items.map((item) => item.plantName)).toEqual(["Pea", "Radish"]);
    expect(groups[1].plantCount).toBe(4);
  });
});

describe("layoutTableRows", () => {
  test("lists each plant group with area, quantity, spacing, and zone size", () => {
    const layout = {
      garden: { width: 10, height: 6 },
      beds: [{ id: "bed-1", name: "Bed 1", x: 1, y: 1, width: 8, height: 4, shape: "rect" }],
      plants: [
        { id: "a", name: "Kale", bedId: "bed-1", x: 2, y: 2, spacingInches: 18, quantity: 4, areaShare: 0.5 },
        { id: "b", name: "Basil", bedId: "bed-1", x: 6, y: 2, spacingInches: 12, quantity: 9, areaShare: 0.5 },
      ],
    };
    const rows = layoutTableRows(layout);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ area: "Bed 1", plant: "Kale", quantity: 4, spacingInches: 18 });
    expect(rows[0].size).toMatch(/^[\d.]+ × [\d.]+ ft$/);
  });
});
