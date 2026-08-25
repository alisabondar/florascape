import { describe, expect, test } from "bun:test";
import {
  GARDEN_PLAN_RESPONSE_SCHEMA,
  buildGardenPlanGenerationPrompt,
  createFallbackGardenPlan,
  normalizeGardenPlan,
  normalizePlannerInput,
} from "./garden-plan";

const raisedBedInput = {
  zipCode: "80123",
  gardenType: "raised_beds",
  gardenTypeLabel: "Raised beds",
  plantTypes: ["vegetables", "herbs"],
  selectedPlants: ["Vegetables", "Herbs"],
  preferences: "Tomatoes and herbs with beginner-friendly care advice.",
  units: [
    { width: 4, length: 8, sunExposure: "full_sun" },
    { width: 3, length: 6, sunExposure: "partial_shade" },
  ],
};

describe("planner input normalization", () => {
  test("rejects incomplete or invalid input", () => {
    expect(normalizePlannerInput({ ...raisedBedInput, zipCode: "123" })).toBeNull();
    expect(normalizePlannerInput({ ...raisedBedInput, selectedPlants: [] })).toBeNull();
  });

  test("owns growing-area IDs and labels", () => {
    const input = normalizePlannerInput(raisedBedInput);

    expect(input.units.map(({ id, name }) => ({ id, name }))).toEqual([
      { id: "bed-1", name: "Bed 1" },
      { id: "bed-2", name: "Bed 2" },
    ]);
  });
});

describe("garden plan boundary", () => {
  test("keeps geometry deterministic and accepts only semantic plant suggestions", () => {
    const rawPlan = {
      recommendedGardenType: "raised_beds",
      summary: "A compact sunny garden.",
      layout: {
        plants: [
          {
            id: "model-id",
            name: "Tomato",
            bedId: "bed-1",
            spacingInches: 24,
            quantity: 2,
            sunNeeds: "full_sun",
            placementReason: "Uses the sunniest bed.",
          },
        ],
      },
      tips: {},
      plantingGuide: [],
    };

    const plan = normalizeGardenPlan(rawPlan, raisedBedInput);

    expect(plan.layout.beds).toHaveLength(2);
    expect(plan.layout.beds[0]).toMatchObject({ id: "bed-1", width: 8, height: 4 });
    expect(plan.layout.plants[0]).toMatchObject({
      name: "Tomato",
      bedId: "bed-1",
      quantity: 2,
    });
    expect(plan.layout).not.toHaveProperty("paths");
    expect(GARDEN_PLAN_RESPONSE_SCHEMA.properties.layout.required).toEqual(["plants"]);
  });

  test("builds a usable local fallback with plants assigned to real beds", () => {
    const plan = createFallbackGardenPlan(raisedBedInput);
    const bedIds = new Set(plan.layout.beds.map((bed) => bed.id));

    expect(plan.layout.beds).toHaveLength(2);
    expect(plan.layout.plants.length).toBeGreaterThan(0);
    expect(plan.layout.plants.every((plant) => bedIds.has(plant.bedId))).toBe(true);
    expect(plan.plantingGuide).toHaveLength(plan.layout.plants.length);
  });

  test("tells Gemini that the server owns geometry", () => {
    const prompt = buildGardenPlanGenerationPrompt(raisedBedInput, "2026-08-25");

    expect(prompt).toContain("The server owns all bed dimensions, coordinates, and drawing geometry");
    expect(prompt).not.toContain("renderStyle");
  });
});
