import { describe, expect, test } from "bun:test";
import { clampSpacingToFacts, findPlantFacts, PLANT_FACTS } from "./plant-facts";
import { createFallbackGardenPlan, normalizeGardenPlan } from "./garden-plan";

const input = {
  zipCode: "80123",
  gardenType: "raised_beds",
  plantTypes: ["vegetables", "herbs", "flowers", "medicinal", "easy_care"],
  selectedPlants: ["Vegetables", "Herbs", "Flowers", "Medicinal Plants", "Easy-Care Plants"],
  units: [{ id: "bed-1", name: "Bed 1", width: 4, length: 8, sunExposure: "full_sun" }],
  preferences: "",
};

describe("plant facts", () => {
  test("covers at least 30 plants including every fallback plant", () => {
    expect(PLANT_FACTS.length).toBeGreaterThanOrEqual(30);
    const plan = createFallbackGardenPlan(input)!;
    expect(plan.layout.plants.length).toBe(10);
    for (const plant of plan.layout.plants) {
      expect(findPlantFacts(plant.name)).not.toBeNull();
    }
  });

  test("matches names and aliases case-insensitively", () => {
    expect(findPlantFacts("cherry TOMATO")?.name).toBe("Tomato");
    expect(findPlantFacts("Unknown Plant")).toBeNull();
  });

  test("clamps spacing to the plant's range and leaves unknown plants alone", () => {
    expect(clampSpacingToFacts("Tomato", 4)).toBe(18);
    expect(clampSpacingToFacts("tomato", 60)).toBe(24);
    expect(clampSpacingToFacts("Basil", 10)).toBe(10);
    expect(clampSpacingToFacts("Mystery Vine", 3)).toBe(3);
  });

  test("clamps model spacing before layout", () => {
    const plan = normalizeGardenPlan(
      {
        layout: {
          plants: [
            { name: "Tomato", bedId: "bed-1", spacingInches: 2, quantity: 2, sunNeeds: "full_sun", placementReason: "Sun" },
          ],
        },
      },
      input,
    );
    expect(plan?.layout.plants[0].spacingInches).toBe(18);
  });
});
