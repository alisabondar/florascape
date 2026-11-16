import { describe, expect, test } from "bun:test";
import { getPlantSectionSizes, layoutToSvgModel, plantSpots, singleBed } from "./garden-layout";
import type { Layout } from "./types";

const layout: Layout = {
  version: "1.0",
  units: "ft",
  garden: {
    width: 12,
    height: 6,
    sunExposure: "",
    gardenType: "Raised beds",
    gardenTypeKey: "raised_beds",
    sunniestSide: "",
  },
  beds: [
    { id: "bed-1", name: "Bed 1", x: 1, y: 1, width: 10, height: 4, shape: "rect" },
  ],
  plants: [
    {
      id: "tomato",
      name: "Tomato",
      bedId: "bed-1",
      x: 3,
      y: 3,
      quantity: 2,
      spacingInches: 24,
      sunNeeds: "full_sun",
      placementReason: "",
    },
    {
      id: "radish",
      name: "Radish",
      bedId: "bed-1",
      x: 8,
      y: 3,
      quantity: 20,
      spacingInches: 3,
      sunNeeds: "full_sun",
      placementReason: "",
    },
  ],
};

describe("garden layout model", () => {
  test("allocates more room to crops with larger spacing requirements", () => {
    const model = layoutToSvgModel(layout, 40);
    const tomato = model.plantPatches.find((patch) => patch.plantId === "tomato");
    const radish = model.plantPatches.find((patch) => patch.plantId === "radish");

    expect(tomato?.width).toBeGreaterThan(radish?.width ?? Infinity);
    expect(model.plantMarkers.filter((marker) => marker.plantId === "tomato")).toHaveLength(2);
    expect(model.plantMarkers.filter((marker) => marker.plantId === "radish").length).toBeLessThanOrEqual(20);
  });

  test("reports the same allocated dimensions used by the sketch", () => {
    const model = layoutToSvgModel(layout);
    const sizes = getPlantSectionSizes(layout);
    const tomatoPatch = model.plantPatches.find((patch) => patch.plantId === "tomato");

    expect(sizes.tomato[0]).toMatchObject({
      bedName: "Bed 1",
      width: Math.round((tomatoPatch?.width ?? 0) * 4) / 4,
      height: Math.round((tomatoPatch?.height ?? 0) * 4) / 4,
    });
  });
});

describe("plantSpots", () => {
  test("places plants on the spacing grid zoneCapacity counts", () => {
    const zone = { x: 0, y: 0, width: 4, height: 2 };
    const spots = plantSpots(zone, { spacingInches: 12, quantity: 8 });
    expect(spots).toHaveLength(8);
    expect(spots[0]).toEqual({ x: 0.5, y: 0.5 });
    expect(spots[7]).toEqual({ x: 3.5, y: 1.5 });
  });

  test("keeps neighbors at least one spacing apart", () => {
    const spots = plantSpots({ x: 1, y: 1, width: 3.3, height: 1.1 }, { spacingInches: 12, quantity: 99 });
    expect(spots).toHaveLength(3);
    expect(spots[1].x - spots[0].x).toBeGreaterThanOrEqual(1);
  });

  test("stops at the quantity", () => {
    expect(plantSpots({ x: 0, y: 0, width: 4, height: 4 }, { spacingInches: 12, quantity: 5 })).toHaveLength(5);
  });

  test("circle beds drop spots outside the circle", () => {
    const bed = { x: 0, y: 0, width: 4, height: 4, shape: "circle" as const };
    const spots = plantSpots({ x: 0, y: 0, width: 4, height: 4 }, { spacingInches: 6, quantity: 999 }, bed);
    expect(spots.length).toBeLessThan(64);
    spots.forEach((spot) => expect(Math.hypot(spot.x - 2, spot.y - 2)).toBeLessThanOrEqual(2));
  });
});

describe("singleBed", () => {
  const grid: Layout = {
    ...layout,
    garden: { ...layout.garden, width: 20, height: 11 },
    beds: [
      { id: "a", name: "A", x: 1, y: 1, width: 8, height: 4, shape: "rect" },
      { id: "c", name: "C", x: 3, y: 7, width: 6, height: 3, shape: "rect" },
    ],
    plants: [
      { ...layout.plants[0], id: "p1", bedId: "c", x: 5, y: 8.5 },
      { ...layout.plants[1], id: "p2", bedId: "a", x: 4, y: 3 },
    ],
  };

  test("keeps one bed and its plants, moved to the corner", () => {
    const one = singleBed(grid, "c");
    expect(one.beds).toEqual([{ id: "c", name: "C", x: 1, y: 1, width: 6, height: 3, shape: "rect" }]);
    expect(one.plants.map((plant) => [plant.id, plant.x, plant.y])).toEqual([["p1", 3, 2.5]]);
    expect(one.garden).toMatchObject({ width: 8, height: 5 });
  });

  test("keeps the bed's zones the same size", () => {
    const size = (value: Layout) => layoutToSvgModel(value, 1, 0).plantPatches.map((patch) => [patch.width, patch.height]);
    expect(size(singleBed(grid, "c"))).toEqual(size(grid).filter((_, index) => layoutToSvgModel(grid, 1, 0).plantPatches[index].bedId === "c"));
  });
});
