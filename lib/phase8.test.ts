import { describe, expect, test } from "bun:test";
import { allocatePlantZones, zoneOrder } from "./garden-layout";
import { createFallbackGardenPlan, swapZones, zoneCapacity } from "./garden-plan";
import { firstInvalidStep, validate, validateStep } from "./planner-validation";
import type { GardenPlan, Layout, PlannerFormErrors, PlannerFormValues } from "./types";
import { clampPan, clampZoom, panBy, zoomAt } from "./sketch-zoom";

const blankForm: PlannerFormValues = {
  zipCode: "",
  gardenType: "",
  preferences: "",
  plantTypes: [],
  inGround: { width: "", length: "", sunniestSide: "", plotStyle: "single", sectionCount: "2" },
  units: [{ id: "u1", width: "", length: "", sunExposure: "" }],
};

describe("per-step validation", () => {
  test("each step reports only its own fields", () => {
    expect(Object.keys(validateStep(blankForm, 0)).sort()).toEqual(["gardenType", "zipCode"]);
    const inGround = { ...blankForm, zipCode: "80205", gardenType: "in_ground" };
    expect(Object.keys(validateStep(inGround, 0))).toEqual([]);
    expect(Object.keys(validateStep(inGround, 1)).sort()).toEqual([
      "inGround.length",
      "inGround.sunniestSide",
      "inGround.width",
    ]);
    expect(Object.keys(validateStep(inGround, 2))).toEqual(["plantTypes"]);
    const beds = { ...blankForm, zipCode: "80205", gardenType: "raised_beds" };
    expect(Object.keys(validateStep(beds, 1))).toEqual(["unit.u1.width", "unit.u1.length", "unit.u1.sunExposure"]);
  });

  test("finds the first step with an error", () => {
    expect(firstInvalidStep(validate(blankForm))).toBe(0);
    expect(firstInvalidStep({ plantTypes: "x" } satisfies PlannerFormErrors)).toBe(2);
    expect(firstInvalidStep({})).toBe(-1);
  });
});

describe("zone swap", () => {
  const input = {
    zipCode: "80205",
    gardenType: "raised_beds",
    gardenTypeLabel: "Raised beds",
    plantTypes: ["vegetables", "herbs", "flowers"],
    selectedPlants: ["Vegetables", "Herbs", "Flowers"],
    preferences: "",
    units: [
      { width: 8, length: 4, sunExposure: "full_sun" },
      { width: 6, length: 3, sunExposure: "partial_shade" },
    ],
  };
  const plan = createFallbackGardenPlan(input, { today: new Date("2026-06-15T12:00:00Z") })!;

  function expectFilled(layout: Layout) {
    layout.beds.forEach((bed) => {
      const plants = layout.plants
        .filter((plant) => plant.bedId === bed.id)
        .sort(zoneOrder(bed));
      allocatePlantZones(bed, plants).forEach((zone) => {
        const plant = plants.find((item) => item.id === zone.plantId)!;
        expect(plant.quantity).toBe(zoneCapacity(zone.width, zone.height, plant.spacingInches));
      });
    });
  }

  test("within a bed, the two groups trade position and share", () => {
    const [first, second] = plan.layout.plants.filter((plant) => plant.bedId === "bed-1");
    const next = swapZones(plan, first.id, second.id);
    const movedFirst = next.layout.plants.find((plant) => plant.id === first.id)!;
    const movedSecond = next.layout.plants.find((plant) => plant.id === second.id)!;
    expect([movedFirst.x, movedFirst.areaShare]).toEqual([second.x, second.areaShare]);
    expect([movedSecond.x, movedSecond.areaShare]).toEqual([first.x, first.areaShare]);
    expectFilled(next.layout);
  });

  test("across beds, the groups trade beds and the guide follows the new quantities", () => {
    const fromBed1 = plan.layout.plants.find((plant) => plant.bedId === "bed-1")!;
    const fromBed2 = plan.layout.plants.find((plant) => plant.bedId === "bed-2")!;
    const next = swapZones(plan, fromBed1.id, fromBed2.id);
    expect(next.layout.plants.find((plant) => plant.id === fromBed1.id)?.bedId).toBe("bed-2");
    expect(next.layout.plants.find((plant) => plant.id === fromBed2.id)?.bedId).toBe("bed-1");
    expectFilled(next.layout);
    const total = (name: string) =>
      next.layout.plants.filter((plant) => plant.name === name).reduce((sum, plant) => sum + plant.quantity, 0);
    next.plantingGuide.forEach((entry) => expect(entry.quantity).toBe(total(entry.plantName)));
  });

  test("reorders zones even when the two plants share a grid column", () => {
    const bed = { id: "b", name: "Bed", x: 0, y: 0, width: 6, height: 4, shape: "rect" as const };
    const tiePlan = {
      layout: {
        garden: { width: 6, height: 4 },
        beds: [bed],
        plants: [
          { id: "top", name: "Basil", bedId: "b", x: 2, y: 1, spacingInches: 12, quantity: 1 },
          { id: "bottom", name: "Kale", bedId: "b", x: 2, y: 3, spacingInches: 18, quantity: 1 },
          { id: "right", name: "Thyme", bedId: "b", x: 5, y: 1, spacingInches: 12, quantity: 1 },
        ],
      },
      alternatives: {},
      plantingGuide: [],
    } as unknown as GardenPlan;
    const order = (layout: Layout) => [...layout.plants].sort(zoneOrder(bed)).map((plant) => plant.id);
    expect(order(tiePlan.layout)).toEqual(["top", "bottom", "right"]);
    expect(order(swapZones(tiePlan, "top", "bottom").layout)).toEqual(["bottom", "top", "right"]);
  });

  test("ignores unknown ids and self-swaps", () => {
    const id = plan.layout.plants[0].id;
    expect(swapZones(plan, id, id)).toBe(plan);
    expect(swapZones(plan, id, "missing")).toBe(plan);
  });
});

describe("zoom and pan math", () => {
  test("zoom is clamped between 1× and 3×", () => {
    expect(clampZoom(0.5)).toBe(1);
    expect(clampZoom(2)).toBe(2);
    expect(clampZoom(9)).toBe(3);
  });

  test("zooming keeps the focal point fixed", () => {
    const view = zoomAt({ scale: 1, x: 0, y: 0 }, 2, { x: 100, y: 50 }, 400, 200);
    expect(view).toEqual({ scale: 2, x: -100, y: -50 });
    // The content point under the focus is the same before and after.
    expect((100 - view.x) / view.scale).toBe(100);
    expect(zoomAt(view, 1, { x: 100, y: 50 }, 400, 200)).toEqual({ scale: 1, x: 0, y: 0 });
  });

  test("panning stays within the sketch bounds", () => {
    const zoomed = { scale: 2, x: -100, y: -50 };
    expect(panBy(zoomed, 500, 500, 400, 200)).toEqual({ scale: 2, x: 0, y: 0 });
    expect(panBy(zoomed, -1000, -1000, 400, 200)).toEqual({ scale: 2, x: -400, y: -200 });
    expect(clampPan({ scale: 1, x: -30, y: 20 }, 400, 200)).toEqual({ scale: 1, x: 0, y: 0 });
  });
});
