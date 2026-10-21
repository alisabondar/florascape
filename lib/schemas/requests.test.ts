import { describe, expect, test } from "bun:test";
import { chatRequest, parseRequest, planRequest } from "./requests";

const plannerInput = {
  zipCode: "80205",
  gardenType: "raised_beds",
  gardenTypeLabel: "Raised beds",
  plantTypes: ["vegetables"],
  selectedPlants: ["Vegetables"],
  preferences: "",
  units: [{ width: 8, length: 4, sunExposure: "full_sun" }],
};

describe("plan request validation", () => {
  test("accepts the planner's normal payload, extra fields included", () => {
    expect(parseRequest(planRequest, { plannerInput }).error).toBeUndefined();
    expect(parseRequest(planRequest, { plannerInput: { ...plannerInput, zipCode: " 80205 " } }).error).toBeUndefined();
  });

  test("names each invalid field", () => {
    const { error } = parseRequest(planRequest, {
      plannerInput: { ...plannerInput, zipCode: "802", gardenType: "rooftop", selectedPlants: [] },
    });
    expect(error).toStartWith("Invalid request: ");
    expect(error).toContain("plannerInput.zipCode (must be a 5-digit ZIP code)");
    expect(error).toContain("plannerInput.gardenType");
    expect(error).toContain("plannerInput.selectedPlants");
    expect(parseRequest(planRequest, null).error).toContain("body");
  });
});

describe("chat request validation", () => {
  const plan = {
    layout: { beds: [{ id: "bed-1", name: "Bed 1" }], plants: [{ id: "p", name: "Kale", bedId: "bed-1" }] },
    alternatives: {},
  };

  test("accepts the chat panel's payload", () => {
    const body = { plan, climate: null, messages: [{ role: "user", text: "Hi" }] };
    expect(parseRequest(chatRequest, body).error).toBeUndefined();
  });

  test("names invalid fields", () => {
    const { error } = parseRequest(chatRequest, {
      plan: { layout: { beds: [], plants: [{ id: "p" }] } },
      messages: [{ role: "system", text: "x" }],
    });
    expect(error).toContain("plan.layout.beds");
    expect(error).toContain("plan.layout.plants.0.name");
    expect(error).toContain("messages.0.role");
  });
});
