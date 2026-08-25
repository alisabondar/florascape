import { describe, expect, test } from "bun:test";
import { getPlantSectionSizes, layoutToSvgModel } from "./garden-layout";

const layout = {
  version: "1.0",
  units: "ft",
  garden: { width: 12, height: 6, gardenType: "Raised beds" },
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
    },
  ],
};

describe("garden layout model", () => {
  test("allocates more room to crops with larger spacing requirements", () => {
    const model = layoutToSvgModel(layout, 40);
    const tomato = model.plantPatches.find((patch) => patch.plantId === "tomato");
    const radish = model.plantPatches.find((patch) => patch.plantId === "radish");

    expect(tomato.width).toBeGreaterThan(radish.width);
    expect(model.plantMarkers.filter((marker) => marker.plantId === "tomato")).toHaveLength(2);
    expect(model.plantMarkers.filter((marker) => marker.plantId === "radish").length).toBeLessThanOrEqual(20);
  });

  test("reports the same allocated dimensions used by the sketch", () => {
    const model = layoutToSvgModel(layout);
    const sizes = getPlantSectionSizes(layout);
    const tomatoPatch = model.plantPatches.find((patch) => patch.plantId === "tomato");

    expect(sizes.tomato[0]).toMatchObject({
      bedName: "Bed 1",
      width: Math.round(tomatoPatch.width * 4) / 4,
      height: Math.round(tomatoPatch.height * 4) / 4,
    });
  });
});
