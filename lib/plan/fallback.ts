import { completePlanLayout, syncPlantingGuide } from "./fill";
import type { Bed, GardenPlan, Plant, PlannerInput, RecommendedGardenType } from "../types";
import { normalizeContainerSetup, type PlanNormalizeOptions } from "./normalize";
import { authoritativeGeometry, gardenTypeTitle, normalizePlannerInput, placePlantsInGeometry } from "./shared";

export function fallbackPlantNames(selectedPlants: string[]): string[] {
  const catalog: Record<string, string[]> = {
    Flowers: ["Marigold", "Zinnia"],
    Vegetables: ["Tomato", "Bush Bean"],
    Herbs: ["Basil", "Thyme"],
    "Medicinal Plants": ["Chamomile", "Calendula"],
    "Easy-Care Plants": ["Leaf Lettuce", "Chives"],
    "Basic Plants": ["Leaf Lettuce", "Chives"],
  };
  const names = selectedPlants.flatMap((category) => catalog[category] || []);
  return [...new Set(names)].slice(0, 10);
}

export function fallbackPlants(input: PlannerInput, beds: Bed[]): Plant[] {
  const names = fallbackPlantNames(input.selectedPlants);
  const source = names.length ? names : ["Marigold", "Basil", "Leaf Lettuce"];
  return source.map((name, index) => ({
    id: `plant-${index + 1}`,
    name,
    bedId: beds[index % beds.length].id,
    x: 0,
    y: 0,
    spacingInches: name === "Tomato" ? 24 : name === "Bush Bean" ? 6 : 8,
    quantity: name === "Tomato" ? 2 : 6,
    sunNeeds: ["Leaf Lettuce", "Chives"].includes(name) ? "partial_shade" : "full_sun",
    placementReason: "Balanced here for sunlight, spacing, and companion planting.",
  }));
}

export function createFallbackGardenPlan(
  plannerInput: unknown,
  { climate = null, today = new Date() }: PlanNormalizeOptions = {},
): GardenPlan | null {
  const input = normalizePlannerInput(plannerInput);
  if (!input) {
    return null;
  }
  const largestArea = input.units.reduce(
    (largest, unit) => Math.max(largest, unit.width * unit.length),
    0,
  );
  const recommendedGardenType: RecommendedGardenType =
    input.gardenType === "any"
      ? largestArea > 0 && largestArea <= 16
        ? "containers"
        : "raised_beds"
      : input.gardenType;
  const geometry = authoritativeGeometry(input, recommendedGardenType);
  const plants = placePlantsInGeometry(fallbackPlants(input, geometry.beds), geometry.beds);
  const { layout, alternatives } = completePlanLayout(
    { version: "1.0", units: "ft", ...geometry, plants },
    [],
    input,
    { climate, today },
  );

  return {
    recommendedGardenType,
    summary: `A beginner-friendly ${gardenTypeTitle(recommendedGardenType).toLowerCase()} plan sized to your submitted growing areas.`,
    layout,
    tips: {
      preferenceHelp: [],
      companionPlanting: [
        { title: "Mix useful neighbors", detail: "Pair flowering plants and herbs with vegetables to support pollinators." },
      ],
      avoid: [
        { title: "Protect airflow", detail: "Keep the shown spacing; crowded leaves stay wet longer." },
      ],
      watering: [
        { title: "Test the soil", detail: "Water when the top inch is dry, then soak deeply instead of sprinkling daily." },
        { title: "Watch both signals", detail: "Dry, crisp leaves suggest thirst; soft yellow leaves can signal excess water." },
      ],
      commonMistakes: [
        { title: "Planting too much", detail: "Begin with the shown quantities and expand after the first harvest." },
      ],
      containerSetup: normalizeContainerSetup({}, recommendedGardenType === "containers"),
    },
    alternatives,
    plantingGuide: syncPlantingGuide([], layout.plants, climate, today),
  };
}

export function createExampleGardenPlan(): GardenPlan | null {
  return createFallbackGardenPlan({
    zipCode: "80205",
    gardenType: "raised_beds",
    gardenTypeLabel: "Raised beds",
    selectedPlants: ["Vegetables", "Herbs", "Flowers"],
    plantTypes: ["vegetables", "herbs", "flowers"],
    preferences: "Pollinator friendly and beginner friendly",
    units: [
      { width: 8, length: 4, sunExposure: "full_sun" },
      { width: 8, length: 4, sunExposure: "partial_shade" },
      { width: 6, length: 3, sunExposure: "full_sun" },
      { width: 6, length: 3, sunExposure: "partial_shade" },
    ],
  });
}
