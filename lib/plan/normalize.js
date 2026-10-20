import { clampSpacingToFacts } from "../plant-facts";
import { MAX_PLANT_QUANTITY } from "../planner-config";
import { completePlanLayout, syncPlantingGuide } from "./fill";
import { PLANTING_WINDOWS, PLANT_SUN_LEVELS, RECOMMENDED_GARDEN_TYPES } from "./schema";
import { authoritativeGeometry, cleanText, finitePositive, normalizePlannerInput, parseJsonLoose, placePlantsInGeometry, round, slugify } from "./shared";

export function normalizeSuggestedPlants(rawLayout) {
  if (!Array.isArray(rawLayout?.plants)) {
    return [];
  }

  return rawLayout.plants
    .map((plant, index) => {
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
          ? plant.sunNeeds
          : "partial_shade",
        placementReason: cleanText(
          plant?.placementReason,
          "Fits this area's light and spacing.",
        ),
      };
    })
    .filter(Boolean)
    .slice(0, 40);
}

export function tipItems(raw, fallback) {
  const source = Array.isArray(raw) ? raw : [];
  const items = source
    .map((item) => {
      if (typeof item === "string") {
        return { title: "Garden tip", detail: cleanText(item) };
      }
      return {
        title: cleanText(item?.title, "Garden tip"),
        detail: cleanText(item?.detail),
      };
    })
    .filter((item) => item.detail)
    .slice(0, 6);
  return items.length ? items : fallback;
}

export function seasonalTimingLabel(whenToPlant) {
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

export function cleanGuideNote(value) {
  const note = cleanText(value);
  return /^adjust for (the )?cultivar and local conditions\.?$/i.test(note) ? "" : note;
}

export function normalizeContainerSetup(raw, applicable) {
  if (!applicable) {
    return null;
  }
  return {
    popularContainer: cleanText(raw?.popularContainer, "Food-safe fabric grow bag"),
    popularityReason: cleanText(
      raw?.popularityReason,
      "A flexible, well-draining choice for beginner container gardens.",
    ),
    setupSteps: Array.isArray(raw?.setupSteps)
      ? raw.setupSteps.map((item) => cleanText(item)).filter(Boolean).slice(0, 6)
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

export function normalizeGuide(rawGuide, plants) {
  const requestedGuide = Array.isArray(rawGuide) ? rawGuide : [];
  const uniqueNames = [...new Set(plants.map((plant) => plant.name))];

  return uniqueNames.map((plantName) => {
    const groups = plants.filter(
      (plant) => plant.name.toLowerCase() === plantName.toLowerCase(),
    );
    const raw = requestedGuide.find(
      (item) => cleanText(item?.plantName).toLowerCase() === plantName.toLowerCase(),
    );
    const whenToPlant = PLANTING_WINDOWS.has(raw?.whenToPlant)
      ? raw.whenToPlant
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

export function normalizeGardenPlan(raw, plannerInput, { climate = null, today = new Date() } = {}) {
  const input = normalizePlannerInput(plannerInput);
  if (!input || !raw || typeof raw !== "object") {
    return null;
  }

  const suggestedPlants = normalizeSuggestedPlants(raw.layout);
  if (!suggestedPlants.length) {
    return null;
  }

  const recommendedGardenType =
    input.gardenType === "any" && RECOMMENDED_GARDEN_TYPES.has(raw.recommendedGardenType)
      ? raw.recommendedGardenType
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
      preferenceHelp: tipItems(raw?.tips?.preferenceHelp, []),
      companionPlanting: tipItems(raw?.tips?.companionPlanting, [
        { title: "Companion planting", detail: "Keep supportive herbs and flowers near crops." },
      ]),
      avoid: tipItems(raw?.tips?.avoid, [
        { title: "Avoid crowding", detail: "Leave enough room for airflow and mature plant size." },
      ]),
      watering: tipItems(raw?.tips?.watering, [
        { title: "Check before watering", detail: "Feel the soil below the surface before adding water." },
      ]),
      commonMistakes: tipItems(raw?.tips?.commonMistakes, [
        { title: "Start manageable", detail: "Plant a small first round and leave room to learn." },
      ]),
      containerSetup: normalizeContainerSetup(
        raw?.tips?.containerSetup,
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

export function parseGardenPlanFromLlmText(rawText, plannerInput, options) {
  const parsed = parseJsonLoose(rawText);
  return normalizeGardenPlan(parsed, plannerInput, options);
}
