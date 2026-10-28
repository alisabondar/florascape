import { describe, expect, test } from "bun:test";
import { allocatePlantZones, zoneOrder } from "../garden-layout";
import {
  buildAlternatives,
  createFallbackGardenPlan,
  fillLayoutToCapacity,
  guideEntryFromFacts,
  normalizeGardenPlan,
  shufflePlan,
  swapPlant,
  topUpPlantGroups,
  zoneCapacity,
} from "../garden-plan";
import type { ClimateContext, Layout, PlannerInput } from "../types";

const input = {
  zipCode: "80123",
  gardenType: "raised_beds",
  gardenTypeLabel: "Raised beds",
  plantTypes: ["vegetables", "herbs"],
  selectedPlants: ["Vegetables", "Herbs"],
  preferences: "I love basil",
  units: [
    { width: 8, length: 4, sunExposure: "full_sun" },
    { width: 2, length: 2, sunExposure: "partial_shade" },
  ],
} as PlannerInput;
const summer = new Date("2026-06-15T12:00:00Z");
const climate: ClimateContext = {
  temperatureRange: null,
  hardinessZone: "6a",
  frost: { lastSpringFrost: "04-25", firstFallFrost: "10-15", growingSeasonDays: 173, yearsAnalyzed: 0 },
  forecast: { days: [], frostWarning: false, frostDays: [] },
};

function modelPlan() {
  return {
    recommendedGardenType: "raised_beds",
    summary: "Sunny vegetables.",
    layout: {
      plants: [
        { name: "Tomato", bedId: "bed-1", spacingInches: 24, quantity: 1, sunNeeds: "full_sun", placementReason: "Sun" },
        { name: "Basil", bedId: "bed-1", spacingInches: 10, quantity: 1, sunNeeds: "full_sun", placementReason: "Sun" },
      ],
    },
    tips: {},
    plantingGuide: [],
    alternatives: [
      { bedId: "bed-1", plants: [{ name: "Pepper Plant Deluxe", spacingInches: 14, sunNeeds: "full_sun", reason: "Model pick." }] },
    ],
  };
}

function expectFilled(layout: Layout) {
  layout.beds.forEach((bed) => {
    const plants = layout.plants
      .filter((plant) => plant.bedId === bed.id)
      .sort(zoneOrder(bed));
    allocatePlantZones(bed, plants).forEach((zone: { plantId: string; width: number; height: number }) => {
      const plant = plants.find((item) => item.id === zone.plantId)!;
      expect(plant.quantity).toBe(zoneCapacity(zone.width, zone.height, plant.spacingInches));
    });
  });
}

describe("capacity fill", () => {
  test("zone capacity is plants per row × rows at spacing", () => {
    expect(zoneCapacity(4, 2, 12)).toBe(8);
    expect(zoneCapacity(4, 4, 6)).toBe(64);
    expect(zoneCapacity(0.5, 0.5, 24)).toBe(1);
  });

  test("raises every group to its zone capacity", () => {
    const plan = normalizeGardenPlan(modelPlan(), input, { climate, today: summer })!;
    expectFilled(plan.layout);
    const basil = plan.layout.plants.find((plant) => plant.name === "Basil")!;
    expect(basil.quantity).toBeGreaterThan(1);
  });

  test("lowers a quantity only when it exceeds capacity", () => {
    const layout = {
      beds: [{ id: "b", x: 0, y: 0, width: 2, height: 2, shape: "rect" }],
      plants: [{ id: "p", name: "Tomato", bedId: "b", x: 1, y: 1, spacingInches: 24, quantity: 40 }],
    } as Layout;
    expect(fillLayoutToCapacity(layout).plants[0].quantity).toBe(1);
  });
});

describe("group top-up", () => {
  test("gives areas of 8+ sq ft three groups and smaller areas one", () => {
    const plan = normalizeGardenPlan(modelPlan(), input, { climate, today: summer })!;
    const count = (bedId: string) => plan.layout.plants.filter((plant) => plant.bedId === bedId).length;
    expect(count("bed-1")).toBeGreaterThanOrEqual(3);
    expect(count("bed-2")).toBeGreaterThanOrEqual(1);
  });

  test("uses plant-facts plants that fit the area's sun and categories", () => {
    const layout = {
      garden: {},
      beds: [{ id: "shade", x: 0, y: 0, width: 4, height: 4, sunExposure: "mostly_shade" }],
      plants: [],
    } as unknown as Layout;
    const topped = topUpPlantGroups(layout, { plantTypes: ["herbs"], climate, today: summer });
    expect(topped.plants).toHaveLength(3);
    topped.plants.forEach((plant) => expect(["partial_shade", "shade"]).toContain(plant.sunNeeds));
  });
});

describe("alternatives", () => {
  test("lists model picks first and at least five per area, excluding planted ones", () => {
    const plan = normalizeGardenPlan(modelPlan(), input, { climate, today: summer })!;
    for (const bed of plan.layout.beds) {
      const list = plan.alternatives[bed.id];
      expect(list.length).toBeGreaterThanOrEqual(5);
      const planted = plan.layout.plants.filter((plant) => plant.bedId === bed.id).map((p) => p.name);
      list.forEach((item) => expect(planted).not.toContain(item.name));
    }
    expect(plan.alternatives["bed-1"][0]).toMatchObject({ name: "Pepper Plant Deluxe", source: "ai" });
  });

  test("treats plant-facts aliases as the same plant", () => {
    const raw = modelPlan();
    raw.layout.plants[1].name = "Sweet Basil";
    raw.alternatives[0].plants.push({ name: "Tomatoes", spacingInches: 24, sunNeeds: "full_sun", reason: "Dup." });
    const plan = normalizeGardenPlan(raw, input, { climate, today: summer })!;
    const names = plan.alternatives["bed-1"].map((item) => item.name);
    expect(names).not.toContain("Basil");
    expect(names).not.toContain("Tomatoes");
  });

  test("drops frost-tender plants during a forecast frost", () => {
    const frosty = { ...climate, forecast: { days: [], frostWarning: true, frostDays: ["2026-10-21"] } };
    const layout = {
      garden: {},
      beds: [{ id: "b", x: 0, y: 0, width: 4, height: 4, sunExposure: "full_sun" }],
      plants: [],
    } as unknown as Layout;
    const alternatives = buildAlternatives(layout, [], { plantTypes: ["vegetables"], climate: frosty, today: summer });
    expect(alternatives.b.map((item) => item.name)).not.toContain("Tomato");
  });

  test("drops frost-tender plants that cannot mature before the first fall frost", () => {
    const layout = {
      garden: {},
      beds: [{ id: "b", x: 0, y: 0, width: 4, height: 4, sunExposure: "full_sun" }],
      plants: [],
    } as unknown as Layout;
    const lateSeason = new Date("2026-10-01T12:00:00Z");
    const names = buildAlternatives(layout, [], { plantTypes: ["vegetables"], climate, today: lateSeason }).b.map(
      (item) => item.name,
    );
    expect(names).not.toContain("Tomato");
    expect(names).toContain("Radish");
  });

  test("starter plans include alternatives too", () => {
    const plan = createFallbackGardenPlan(input, { climate, today: summer })!;
    expect(plan.alternatives["bed-1"].length).toBeGreaterThanOrEqual(5);
    expectFilled(plan.layout);
  });
});

describe("swap and shuffle", () => {
  test("swap replaces the plant, applies its spacing, refills, and updates the guide", () => {
    const plan = normalizeGardenPlan(modelPlan(), input, { climate, today: summer })!;
    const tomato = plan.layout.plants.find((plant) => plant.name === "Tomato")!;
    const choice = plan.alternatives["bed-1"].find((item) => item.name === "Kale")
      || plan.alternatives["bed-1"][1];
    const next = swapPlant(plan, tomato.id, choice.name, { climate, today: summer });

    const swapped = next.layout.plants.find((plant) => plant.name === choice.name && plant.bedId === "bed-1");
    expect(swapped).toBeTruthy();
    expect(next.layout.plants.some((plant) => plant.name === "Tomato" && plant.bedId === "bed-1")).toBe(false);
    expect(next.plantingGuide.some((entry) => entry.plantName === choice.name)).toBe(true);
    expect(next.plantingGuide.some((entry) => entry.plantName === "Tomato")).toBe(false);
    expect(next.alternatives["bed-1"].some((item) => item.name === "Tomato")).toBe(true);
    expectFilled(next.layout);
  });

  test("shuffle changes every area's plants without leaving zones empty", () => {
    const plan = normalizeGardenPlan(modelPlan(), input, { climate, today: summer })!;
    let seed = 7;
    const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const next = shufflePlan(plan, { climate, today: summer, random });

    for (const bed of plan.layout.beds) {
      const before = plan.layout.plants.filter((plant) => plant.bedId === bed.id).map((p) => p.name);
      const after = next.layout.plants.filter((plant) => plant.bedId === bed.id).map((p) => p.name);
      expect(after).toHaveLength(before.length);
      after.forEach((name) => expect(before).not.toContain(name));
    }
    expectFilled(next.layout);
    const names = new Set(next.layout.plants.map((plant) => plant.name));
    expect(next.plantingGuide.map((entry) => entry.plantName).sort()).toEqual([...names].sort());
  });
});

describe("guide entries from plant facts", () => {
  test("times plantings from frost tolerance and frost dates", () => {
    const tomato = guideEntryFromFacts("Tomato", 4, climate, summer);
    expect(tomato.whenToPlant).toBe("now");
    expect(tomato.spacingInches).toBe(24);
    expect(tomato.timingDetails).toContain("70 days");

    const earlySpring = guideEntryFromFacts("Tomato", 4, climate, new Date("2026-03-20T12:00:00Z"));
    expect(earlySpring.whenToPlant).toBe("next_month");
    const winter = guideEntryFromFacts("Tomato", 4, climate, new Date("2026-01-20T12:00:00Z"));
    expect(winter.whenToPlant).toBe("next_season");
    expect(winter.timingLabel).toBe("Plant this spring");
    const pea = guideEntryFromFacts("Pea", 10, climate, new Date("2026-03-20T12:00:00Z"));
    expect(pea.whenToPlant).toBe("now");
  });
});
