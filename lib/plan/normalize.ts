import { clampSpacingToFacts } from "../plant-facts";
import { MAX_PLANT_QUANTITY } from "../planner-config";
import { completePlanLayout, syncPlantingGuide } from "./fill";
import { PLANTING_WINDOWS, PLANT_SUN_LEVELS, RECOMMENDED_GARDEN_TYPES } from "./schema";
import type {
  ClimateContext,
  ContainerSetup,
  GardenPlan,
  GuideEntry,
  Plant,
  PlantingWindow,
  PlantSunNeeds,
  RecommendedGardenType,
  TipItem,
} from "../types";
import { asRecord, authoritativeGeometry, cleanText, finitePositive, normalizePlannerInput, parseJsonLoose, placePlantsInGeometry, round, slugify } from "./shared";

export interface PlanNormalizeOptions {
  climate?: ClimateContext | null;
  today?: Date;
}

export function normalizeSuggestedPlants(rawLayout: unknown): Plant[] {
  const rawPlants = asRecord(rawLayout)?.plants;
  if (!Array.isArray(rawPlants)) {
    return [];
  }

  return rawPlants
    .map((rawPlant: unknown, index: number): Plant | null => {
      const plant = asRecord(rawPlant);
      const name = cleanText(plant?.name);
      const bedId = cleanText(plant?.bedId);
      if (!name || !bedId) {
        return null;
      }

      return {
        id: `plant-${index + 1}-${slugify(name)}`,
        name,
        bedId,
        x: 0,
        y: 0,
        spacingInches: round(
          clampSpacingToFacts(name, finitePositive(plant?.spacingInches) || 8),
        ),
        quantity: Math.max(1, Math.min(MAX_PLANT_QUANTITY, Math.floor(Number(plant?.quantity) || 1))),
        sunNeeds: PLANT_SUN_LEVELS.has(plant?.sunNeeds)
          ? (plant?.sunNeeds as PlantSunNeeds)
          : "partial_shade",
        placementReason: cleanText(
          plant?.placementReason,
          "Fits this area's light and spacing.",
        ),
      };
    })
    .filter((plant: Plant | null): plant is Plant => plant !== null)
    .slice(0, 40);
}

export function tipItems(raw: unknown, fallback: TipItem[]): TipItem[] {
  const source = Array.isArray(raw) ? raw : [];
  const items = source
    .map((rawItem: unknown): TipItem => {
      if (typeof rawItem === "string") {
        return { title: "Garden tip", detail: cleanText(rawItem) };
      }
      const item = asRecord(rawItem);
      return {
        title: cleanText(item?.title, "Garden tip"),
        detail: cleanText(item?.detail),
      };
    })
    .filter((item) => item.detail)
    .slice(0, 6);
  return items.length ? items : fallback;
}

export function seasonalTimingLabel(whenToPlant: PlantingWindow): string {
  if (whenToPlant === "now") {
    return "Plant now";
  }
  if (whenToPlant === "next_month") {
    return "Plant next month";
  }

  const month = new Date().getMonth();
  const nextSeason =
    month <= 1 ? "spring" : month <= 4 ? "summer" : month <= 7 ? "fall" : "spring";
  return `Plant this ${nextSeason}`;
}

export function cleanGuideNote(value: unknown): string {
  const note = cleanText(value);
  return /^adjust for (the )?cultivar and local conditions\.?$/i.test(note) ? "" : note;
}

export function normalizeContainerSetup(rawSetup: unknown, applicable: boolean): ContainerSetup | null {
  if (!applicable) {
    return null;
  }
  const raw = asRecord(rawSetup);
  const setupSteps = raw?.setupSteps;
  return {
    popularContainer: cleanText(raw?.popularContainer, "Food-safe fabric grow bag"),
    popularityReason: cleanText(
      raw?.popularityReason,
      "A flexible, well-draining choice for beginner container gardens.",
    ),
    setupSteps: Array.isArray(setupSteps)
      ? setupSteps.map((item: unknown) => cleanText(item)).filter(Boolean).slice(0, 6)
      : ["Place it where it receives the planned amount of sun.", "Fill with fresh potting mix."],
    compostAdvice: cleanText(
      raw?.compostAdvice,
      "Blend finished compost into potting mix without using compost alone.",
    ),
    drainageAdvice: cleanText(
      raw?.drainageAdvice,
      "Confirm open drainage holes and keep the container slightly raised.",
    ),
  };
}

export function normalizeGuide(rawGuide: unknown, plants: Plant[]): GuideEntry[] {
  const requestedGuide = Array.isArray(rawGuide) ? rawGuide : [];
  const uniqueNames = [...new Set(plants.map((plant) => plant.name))];

  return uniqueNames.map((plantName) => {
    const groups = plants.filter(
      (plant) => plant.name.toLowerCase() === plantName.toLowerCase(),
    );
    const raw = asRecord(
      requestedGuide.find(
        (item: unknown) =>
          cleanText(asRecord(item)?.plantName).toLowerCase() === plantName.toLowerCase(),
      ),
    );
    const whenToPlant: PlantingWindow = PLANTING_WINDOWS.has(raw?.whenToPlant)
      ? (raw?.whenToPlant as PlantingWindow)
      : "next_season";
    const spacing = finitePositive(raw?.spacingInches) || groups[0]?.spacingInches || 8;

    return {
      id: `guide-${slugify(plantName)}`,
      plantName,
      quantity: groups.reduce((sum, group) => sum + (Number(group.quantity) || 1), 0),
      whenToPlant,
      timingLabel: cleanText(raw?.timingLabel, seasonalTimingLabel(whenToPlant)),
      timingDetails: cleanText(
        raw?.timingDetails,
        "Confirm local frost timing before planting.",
      ),
      spacingInches: round(clampSpacingToFacts(plantName, spacing)),
      sowingAmount: cleanText(
        raw?.sowingAmount,
        `Start a few extra seeds and thin to ${groups.reduce((sum, group) => sum + (Number(group.quantity) || 1), 0)} healthy plants.`,
      ),
      plantingDepth: cleanText(raw?.plantingDepth),
      watering: cleanText(raw?.watering),
      notes: cleanGuideNote(raw?.notes),
    };
  });
}

export function normalizeGardenPlan(
  rawPlan: unknown,
  plannerInput: unknown,
  { climate = null, today = new Date() }: PlanNormalizeOptions = {},
): GardenPlan | null {
  const input = normalizePlannerInput(plannerInput);
  const raw = asRecord(rawPlan);
  if (!input || !raw) {
    return null;
  }
  const rawTips = asRecord(raw.tips);

  const suggestedPlants = normalizeSuggestedPlants(raw.layout);
  if (!suggestedPlants.length) {
    return null;
  }

  const recommendedGardenType: RecommendedGardenType =
    input.gardenType === "any" && RECOMMENDED_GARDEN_TYPES.has(raw.recommendedGardenType)
      ? (raw.recommendedGardenType as RecommendedGardenType)
      : input.gardenType === "any"
        ? "raised_beds"
        : input.gardenType;
  const geometry = authoritativeGeometry(input, recommendedGardenType);
  const plants = placePlantsInGeometry(suggestedPlants, geometry.beds);
  const { layout, alternatives } = completePlanLayout(
    { version: "1.0", units: "ft", ...geometry, plants },
    raw.alternatives,
    input,
    { climate, today },
  );

  return {
    recommendedGardenType,
    summary: cleanText(
      raw.summary,
      "A practical starter garden arranged around your available space and light.",
    ),
    layout,
    tips: {
      preferenceHelp: tipItems(rawTips?.preferenceHelp, []),
      companionPlanting: tipItems(rawTips?.companionPlanting, [
        { title: "Companion planting", detail: "Keep supportive herbs and flowers near crops." },
      ]),
      avoid: tipItems(rawTips?.avoid, [
        { title: "Avoid crowding", detail: "Leave enough room for airflow and mature plant size." },
      ]),
      watering: tipItems(rawTips?.watering, [
        { title: "Check before watering", detail: "Feel the soil below the surface before adding water." },
      ]),
      commonMistakes: tipItems(rawTips?.commonMistakes, [
        { title: "Start manageable", detail: "Plant a small first round and leave room to learn." },
      ]),
      containerSetup: normalizeContainerSetup(
        rawTips?.containerSetup,
        recommendedGardenType === "containers",
      ),
    },
    alternatives,
    plantingGuide: syncPlantingGuide(
      normalizeGuide(raw.plantingGuide, plants),
      layout.plants,
      climate,
      today,
    ),
  };
}

export function parseGardenPlanFromLlmText(
  rawText: unknown,
  plannerInput: unknown,
  options?: PlanNormalizeOptions,
): GardenPlan | null {
  const parsed = parseJsonLoose(rawText);
  return normalizeGardenPlan(parsed, plannerInput, options);
}
