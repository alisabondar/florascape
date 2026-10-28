import { allocatePlantZones, plantZoneWeights, zoneOrder } from "../garden-layout";
import { clampSpacingToFacts, findPlantFacts, PLANT_FACTS } from "../plant-facts";
import { MAX_PLANT_QUANTITY } from "../planner-config";
import type {
  Alternative,
  AlternativesByBed,
  AreaSunExposure,
  Bed,
  ClimateContext,
  Garden,
  GardenPlan,
  GuideEntry,
  Layout,
  Plant,
  PlantFact,
  PlantingWindow,
  PlantSunNeeds,
} from "../types";

const MIN_GROUPS_LARGE_AREA = 3;
const LARGE_AREA_SQ_FT = 8;
const MIN_ALTERNATIVES = 5;
const MAX_ALTERNATIVES = 14;
const REFERENCE_YEAR = 2001;

type Climate = ClimateContext | null | undefined;

export interface PlantFactsContext {
  garden?: Garden | null;
  plantTypes?: string[];
  preferences?: string;
  climate?: Climate;
  today?: Date;
}

export interface EditOptions {
  climate?: Climate;
  today?: Date;
}

export interface DayWindow {
  start: number;
  end: number;
}

export interface PlantingTiming {
  whenToPlant: PlantingWindow;
  timingLabel: string;
  timingDetails: string;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function isSunNeeds(value: unknown): value is PlantSunNeeds {
  return value === "full_sun" || value === "partial_shade" || value === "shade";
}

function slug(value: unknown): string {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// Compares plants by their plant-facts identity so aliases ("Sweet Basil", "Basil") match.
function canonicalName(name: unknown): string {
  return (findPlantFacts(name)?.name || String(name || "")).trim().toLowerCase();
}

function sameName(left: unknown, right: unknown): boolean {
  return canonicalName(left) === canonicalName(right);
}

/** Plants per row × rows at the plant's spacing. Circle beds keep only the inscribed share. */
export function zoneCapacity(
  widthFt: number,
  heightFt: number,
  spacingInches: number | undefined,
  shape: Bed["shape"] = "rect",
): number {
  const spacing = Math.max(1, Number(spacingInches) || 8);
  const perRow = Math.max(1, Math.floor((widthFt * 12) / spacing));
  const rows = Math.max(1, Math.floor((heightFt * 12) / spacing));
  const capacity = perRow * rows;
  return Math.max(1, Math.min(MAX_PLANT_QUANTITY, shape === "circle" ? Math.floor(capacity * (Math.PI / 4)) : capacity));
}

function capacitiesForBed(bed: Bed, plants: Plant[]): Map<string, number> {
  // Same ordering as layoutToSvgModel so capacities match the drawn zones.
  const ordered = [...plants].sort(zoneOrder(bed));
  const zones = allocatePlantZones(bed, ordered);
  return new Map(
    zones.map((zone: { plantId: string; width: number; height: number }) => {
      const plant = plants.find((item) => item.id === zone.plantId);
      return [zone.plantId, zoneCapacity(zone.width, zone.height, plant?.spacingInches, bed.shape)];
    }),
  );
}

/**
 * Locks each group's share of its area, then sets its quantity to the capacity of the
 * zone that share produces. Locking the share keeps zones stable, so quantities match
 * the drawn zones exactly; a swapped-in plant inherits the zone of the plant it replaced.
 */
export function fillLayoutToCapacity(layout: Layout): Layout {
  const plants = layout.beds.flatMap((bed) => {
    const bedPlants = layout.plants.filter((plant) => plant.bedId === bed.id);
    const weights = plantZoneWeights(bedPlants);
    const total = weights.reduce((sum: number, weight: number) => sum + weight, 0) || 1;
    const shared = bedPlants.map((plant, index) => ({
      ...plant,
      areaShare: Math.round((weights[index] / total) * 10000) / 10000,
    }));
    const capacities = capacitiesForBed(bed, shared);
    return shared.map((plant) => ({ ...plant, quantity: capacities.get(plant.id) ?? plant.quantity }));
  });
  const unplaced = layout.plants.filter((plant) => !layout.beds.some((bed) => bed.id === plant.bedId));
  return { ...layout, plants: [...plants, ...unplaced] };
}

export function bedSunLevel(bed: Bed, garden: Garden | null | undefined): AreaSunExposure {
  if (bed.sunExposure) {
    return bed.sunExposure;
  }
  return garden?.sunniestSide === "fully_shaded" ? "mostly_shade" : "full_sun";
}

function sunFits(plantSun: PlantSunNeeds, bedSun: AreaSunExposure): boolean {
  if (bedSun === "full_sun") {
    return plantSun === "full_sun" || plantSun === "partial_shade";
  }
  if (bedSun === "partial_shade") {
    return plantSun === "partial_shade" || plantSun === "shade";
  }
  return plantSun === "shade" || plantSun === "partial_shade";
}

function categoryFits(fact: PlantFact, plantTypes: string[] | undefined): boolean {
  if (!plantTypes?.length) {
    return true;
  }
  return plantTypes.includes(fact.category) || (plantTypes.includes("basic") && fact.easyCare);
}

export function dayOfYear(date: Date): number {
  return Math.round(
    (Date.UTC(REFERENCE_YEAR, date.getUTCMonth(), date.getUTCDate()) - Date.UTC(REFERENCE_YEAR, 0, 1)) /
      86400000,
  );
}

function monthDayToDayOfYear(monthDay: string | null | undefined): number | null {
  if (!monthDay) {
    return null;
  }
  const [month, day] = monthDay.split("-").map(Number);
  return dayOfYear(new Date(Date.UTC(REFERENCE_YEAR, month - 1, day)));
}

function isFrostSeason(climate: Climate, today: Date): boolean {
  if (climate?.forecast?.frostWarning) {
    return true;
  }
  const lastSpring = monthDayToDayOfYear(climate?.frost?.lastSpringFrost);
  const firstFall = monthDayToDayOfYear(climate?.frost?.firstFallFrost);
  const now = dayOfYear(today);
  return (lastSpring !== null && now < lastSpring) || (firstFall !== null && now >= firstFall);
}

function mentionedInPreferences(fact: PlantFact, preferences: string | undefined): boolean {
  const text = String(preferences || "").toLowerCase();
  return [fact.name, ...fact.aliases].some((name) => text.includes(name.toLowerCase()));
}

/** Plant-facts entries suited to a bed's sun, the chosen categories, and the season. */
export function suitablePlantFacts(
  bed: Bed,
  { garden, plantTypes, preferences, climate, today = new Date() }: PlantFactsContext,
  { seasonOnly = false }: { seasonOnly?: boolean } = {},
): PlantFact[] {
  const bedSun = bedSunLevel(bed, garden);
  const frostSeason = isFrostSeason(climate, today);
  const firstFall = monthDayToDayOfYear(climate?.frost?.firstFallFrost);
  const now = dayOfYear(today);
  // A tender plant also misses the season if it can't mature before the first fall frost.
  const missesSeason = (fact: PlantFact) =>
    fact.frostTolerance === "tender" &&
    (frostSeason || (firstFall !== null && now <= firstFall && now + fact.daysToMaturity > firstFall));
  return PLANT_FACTS.filter(
    (fact) =>
      !missesSeason(fact) &&
      (seasonOnly || (sunFits(fact.sunNeeds, bedSun) && categoryFits(fact, plantTypes))),
  ).sort(
    (left, right) =>
      Number(mentionedInPreferences(right, preferences)) - Number(mentionedInPreferences(left, preferences)),
  );
}

// Facts-based plants use the wide end of the spacing range: capacity applies spacing in
// both directions, so in-row minimums would pack beds far denser than beginners can manage.
function plantFromFact(fact: PlantFact, bedId: string, index: number): Plant {
  return {
    id: `plant-${bedId}-${index}-${slug(fact.name)}`,
    name: fact.name,
    bedId,
    x: 0,
    y: 0,
    spacingInches: fact.spacingInches.max,
    quantity: 1,
    sunNeeds: fact.sunNeeds,
    placementReason: "Added to use this area's open space.",
  };
}

/** Adds plant-facts groups to any area with fewer groups than its size calls for. */
export function topUpPlantGroups(layout: Layout, context: PlantFactsContext): Layout {
  const added: Plant[] = [];
  layout.beds.forEach((bed) => {
    const bedPlants = layout.plants.filter((plant) => plant.bedId === bed.id);
    const minimum = bed.width * bed.height >= LARGE_AREA_SQ_FT ? MIN_GROUPS_LARGE_AREA : 1;
    const candidates = suitablePlantFacts(bed, { ...context, garden: layout.garden }).filter(
      (fact) => !bedPlants.some((plant) => sameName(plant.name, fact.name)),
    );
    // If sun and category filters leave nothing, any in-season plant still beats an empty area.
    const pool = candidates.length
      ? candidates
      : suitablePlantFacts(bed, { ...context, garden: layout.garden }, { seasonOnly: true }).filter(
          (fact) => !bedPlants.some((plant) => sameName(plant.name, fact.name)),
        );
    // Size new groups like an average existing group so they get a fair share of the area.
    const weights = plantZoneWeights(bedPlants);
    const averageWeight = weights.length
      ? weights.reduce((sum: number, weight: number) => sum + weight, 0) / weights.length
      : 1;
    for (let index = bedPlants.length; index < minimum && pool.length; index += 1) {
      const plant = plantFromFact(pool.shift() as PlantFact, bed.id, index + 1);
      const spacingFeet = plant.spacingInches / 12;
      plant.quantity = Math.max(1, Math.round(averageWeight / (spacingFeet * spacingFeet)));
      added.push(plant);
    }
  });

  if (!added.length) {
    return layout;
  }
  const toppedBeds = new Set(added.map((plant) => plant.bedId));
  const plants = layout.plants.map((plant) =>
    toppedBeds.has(plant.bedId) ? { ...plant, areaShare: undefined } : plant,
  );
  return { ...layout, plants: [...plants, ...added] };
}

function alternativeFromFact(fact: PlantFact, source: Alternative["source"] = "facts"): Alternative {
  return {
    name: fact.name,
    spacingInches: fact.spacingInches.max,
    sunNeeds: fact.sunNeeds,
    reason: fact.easyCare ? "Easy-care fit for this area." : "Suits this area's light and season.",
    source,
  };
}

/**
 * Builds each area's alternatives: model suggestions first, then plant-facts picks,
 * excluding plants already in the area, until there are at least five.
 */
export function buildAlternatives(
  layout: Layout,
  rawAlternatives: unknown,
  context: PlantFactsContext,
): AlternativesByBed {
  const byBed: AlternativesByBed = {};
  layout.beds.forEach((bed) => {
    const inBed = layout.plants.filter((plant) => plant.bedId === bed.id);
    const list: Alternative[] = [];
    const add = (alternative: Alternative) => {
      if (
        alternative?.name &&
        list.length < MAX_ALTERNATIVES &&
        !list.some((item) => sameName(item.name, alternative.name)) &&
        !inBed.some((plant) => sameName(plant.name, alternative.name))
      ) {
        list.push(alternative);
      }
    };

    const fromModel: unknown = (Array.isArray(rawAlternatives) ? rawAlternatives : []).find(
      (entry: unknown) => asRecord(entry)?.bedId === bed.id,
    );
    const modelPlants = asRecord(fromModel)?.plants;
    (Array.isArray(modelPlants) ? modelPlants : []).forEach((raw: unknown) => {
      const plant = asRecord(raw);
      const name = String(plant?.name || "").trim();
      const spacing = Number(plant?.spacingInches) > 0 ? Number(plant?.spacingInches) : 8;
      const sunNeeds = plant?.sunNeeds;
      add({
        name,
        spacingInches: Math.round(clampSpacingToFacts(name, spacing)),
        sunNeeds: isSunNeeds(sunNeeds)
          ? sunNeeds
          : findPlantFacts(name)?.sunNeeds || "partial_shade",
        reason: String(plant?.reason || "").trim() || "Recommended for this area.",
        source: "ai",
      });
    });

    suitablePlantFacts(bed, { ...context, garden: layout.garden }).forEach((fact) =>
      add(alternativeFromFact(fact)),
    );
    // Relax the sun and category filters (never the season) if the area has too few options.
    if (list.length < MIN_ALTERNATIVES) {
      suitablePlantFacts(bed, { ...context, garden: layout.garden }, { seasonOnly: true }).forEach((fact) =>
        add(alternativeFromFact(fact)),
      );
    }
    byBed[bed.id] = list;
  });
  return byBed;
}

function formatMonthDay(monthDay: string): string {
  const [month, day] = monthDay.split("-").map(Number);
  return new Date(Date.UTC(REFERENCE_YEAR, month - 1, day)).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

function seasonName(doy: number): string {
  if (doy < 59 || doy >= 334) return "winter";
  if (doy < 151) return "spring";
  if (doy < 243) return "summer";
  return "fall";
}

function frostOffsetDays(fact: PlantFact): number {
  return fact.frostTolerance === "hardy" ? 42 : fact.frostTolerance === "semi_hardy" ? 14 : 0;
}

/**
 * Planting window as day-of-year bounds: frost-hardier plants can go in weeks before the
 * last spring frost, and every plant must mature before the first fall frost. Returns
 * null when no frost dates are known.
 */
export function plantingWindowDays(fact: PlantFact, climate: Climate): DayWindow | null {
  const lastSpring = monthDayToDayOfYear(climate?.frost?.lastSpringFrost);
  const firstFall = monthDayToDayOfYear(climate?.frost?.firstFallFrost);
  if (lastSpring === null && firstFall === null) {
    return null;
  }
  const earlyOffset = frostOffsetDays(fact);
  const lateOffset = fact.frostTolerance === "tender" ? 0 : earlyOffset;
  return {
    start: (lastSpring ?? 0) - earlyOffset,
    end: (firstFall ?? 365) - fact.daysToMaturity + lateOffset,
  };
}

/** Chooses now / next_month / next_season from frost tolerance and the local frost dates. */
export function plantingWindowFromFacts(fact: PlantFact, climate: Climate, today: Date = new Date()): PlantingTiming {
  const lastSpring = monthDayToDayOfYear(climate?.frost?.lastSpringFrost);
  const firstFall = monthDayToDayOfYear(climate?.frost?.firstFallFrost);
  const now = dayOfYear(today);
  const tender = fact.frostTolerance === "tender";

  if (lastSpring === null && firstFall === null) {
    if (climate?.frost) {
      return { whenToPlant: "now", timingLabel: "Plant now", timingDetails: "Your area rarely sees frost." };
    }
    return {
      whenToPlant: "next_season",
      timingLabel: `Plant this ${seasonName((now + 60) % 365)}`,
      timingDetails: `${tender ? "Frost-tender: plant after your last spring frost." : "Tolerates light frost."} Confirm local frost timing before planting.`,
    };
  }

  const earlyOffset = frostOffsetDays(fact);
  // Non-null: at least one frost date is known past the check above.
  const { start, end } = plantingWindowDays(fact, climate) as DayWindow;
  const frostNote = tender
    ? `Frost-tender: plant after the last spring frost${climate?.frost?.lastSpringFrost ? ` (around ${formatMonthDay(climate.frost.lastSpringFrost)})` : ""}.`
    : `Tolerates ${fact.frostTolerance === "hardy" ? "frost" : "light frost"}; plant up to ${earlyOffset / 7} weeks before the last spring frost.`;
  const details = `${frostNote} Ready in about ${fact.daysToMaturity} days.`;

  if (now >= start && now <= end) {
    return { whenToPlant: "now", timingLabel: "Plant now", timingDetails: details };
  }
  const untilStart = (start - now + 365) % 365;
  if (untilStart <= 45) {
    return { whenToPlant: "next_month", timingLabel: "Plant next month", timingDetails: details };
  }
  return {
    whenToPlant: "next_season",
    timingLabel: `Plant this ${seasonName(Math.max(0, start) % 365)}`,
    timingDetails: details,
  };
}

export function guideEntryFromFacts(
  plantName: string,
  quantity: number,
  climate: Climate,
  today: Date = new Date(),
): GuideEntry {
  const fact = findPlantFacts(plantName);
  const spacing = fact ? fact.spacingInches.max : 8;
  const timing: PlantingTiming = fact
    ? plantingWindowFromFacts(fact, climate, today)
    : {
        whenToPlant: "next_season",
        timingLabel: "Plant this spring",
        timingDetails: "Confirm local frost timing before planting.",
      };

  return {
    id: `guide-${slug(plantName)}`,
    plantName,
    quantity,
    ...timing,
    spacingInches: spacing,
    sowingAmount: `Start a few extra seeds and thin to ${quantity} healthy plants.`,
    plantingDepth: "",
    watering: "",
    notes: "",
  };
}

/** Keeps guide entries for plants still in the layout, updates quantities, and adds missing ones. */
export function syncPlantingGuide(
  plantingGuide: GuideEntry[] | null | undefined,
  plants: Plant[],
  climate: Climate,
  today: Date = new Date(),
): GuideEntry[] {
  const names = [...new Set(plants.map((plant) => plant.name))];
  return names.map((name) => {
    const quantity = plants
      .filter((plant) => sameName(plant.name, name))
      .reduce((sum, plant) => sum + (Number(plant.quantity) || 1), 0);
    const existing = (plantingGuide || []).find((entry) => sameName(entry.plantName, name));
    return existing
      ? {
          ...existing,
          quantity,
          sowingAmount: existing.sowingAmount?.replace(/thin to \d+/, `thin to ${quantity}`),
        }
      : guideEntryFromFacts(name, quantity, climate, today);
  });
}

function withSwappedOut(
  alternatives: AlternativesByBed | null | undefined,
  bedId: string,
  removedPlants: Plant[],
  addedNames: string[],
): AlternativesByBed {
  const current = (alternatives?.[bedId] || []).filter(
    (item) => !addedNames.some((name) => sameName(name, item.name)),
  );
  const returned = removedPlants
    .filter((plant) => !current.some((item) => sameName(item.name, plant.name)))
    .map((plant): Alternative => ({
      name: plant.name,
      spacingInches: plant.spacingInches,
      sunNeeds: plant.sunNeeds,
      reason: plant.placementReason,
      source: "plan",
    }));
  return { ...alternatives, [bedId]: [...current, ...returned] };
}

function applyAlternative(plant: Plant, alternative: Alternative): Plant {
  return {
    ...plant,
    id: `${plant.id.split("--")[0]}--${slug(alternative.name)}`,
    name: alternative.name,
    spacingInches: Math.round(clampSpacingToFacts(alternative.name, alternative.spacingInches || 8)),
    sunNeeds: alternative.sunNeeds,
    placementReason: alternative.reason,
  };
}

function finishEdit(
  plan: GardenPlan,
  plants: Plant[],
  alternatives: AlternativesByBed,
  climate: Climate,
  today: Date,
): GardenPlan {
  const layout = fillLayoutToCapacity({ ...plan.layout, plants });
  return {
    ...plan,
    layout,
    alternatives,
    plantingGuide: syncPlantingGuide(plan.plantingGuide, layout.plants, climate, today),
  };
}

/** Replaces one plant group with an alternative from its area; the old plant becomes an alternative. */
export function swapPlant(
  plan: GardenPlan,
  plantId: string,
  alternativeName: string,
  { climate = null, today = new Date() }: EditOptions = {},
): GardenPlan {
  const target = plan.layout.plants.find((plant) => plant.id === plantId);
  const alternative = plan.alternatives?.[target?.bedId ?? ""]?.find((item) =>
    sameName(item.name, alternativeName),
  );
  if (!target || !alternative) {
    return plan;
  }

  const plants = plan.layout.plants.map((plant) =>
    plant.id === plantId ? applyAlternative(plant, alternative) : plant,
  );
  const alternatives = withSwappedOut(plan.alternatives, target.bedId, [target], [alternative.name]);
  return finishEdit(plan, plants, alternatives, climate, today);
}

/** Replaces every area's plants with a random different selection from its alternatives. */
export function shufflePlan(
  plan: GardenPlan,
  { climate = null, today = new Date(), random = Math.random }: EditOptions & { random?: () => number } = {},
): GardenPlan {
  let alternatives: AlternativesByBed = { ...plan.alternatives };
  let plants = [...plan.layout.plants];

  plan.layout.beds.forEach((bed) => {
    const bedPlants = plants.filter((plant) => plant.bedId === bed.id);
    const pool = [...(alternatives[bed.id] || [])];
    if (!bedPlants.length || !pool.length) {
      return;
    }

    // Fisher–Yates shuffle, then take one pick per group in the area.
    for (let index = pool.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(random() * (index + 1));
      [pool[index], pool[swapIndex]] = [pool[swapIndex], pool[index]];
    }
    const picks = pool.slice(0, bedPlants.length);
    const replaced = bedPlants.slice(0, picks.length);
    const nextById = new Map(replaced.map((plant, index) => [plant.id, applyAlternative(plant, picks[index])]));

    plants = plants.map((plant) => nextById.get(plant.id) || plant);
    alternatives = withSwappedOut(alternatives, bed.id, replaced, picks.map((pick) => pick.name));
  });

  return finishEdit(plan, plants, alternatives, climate, today);
}

/** Generation-time pass: top up thin areas, fill every zone, and attach alternatives. */
export function completePlanLayout(
  layout: Layout,
  rawAlternatives: unknown,
  input: { plantTypes?: string[]; preferences?: string },
  { climate = null, today = new Date() }: EditOptions = {},
): { layout: Layout; alternatives: AlternativesByBed } {
  const context: PlantFactsContext = {
    plantTypes: input.plantTypes,
    preferences: input.preferences,
    climate,
    today,
  };
  const filled = fillLayoutToCapacity(topUpPlantGroups(layout, context));
  return { layout: filled, alternatives: buildAlternatives(filled, rawAlternatives, context) };
}

/**
 * Swaps two plant groups' places: position and share of the bed, plus the bed itself when
 * they are in different beds. Both beds are then refilled to capacity.
 */
export function swapZones(
  plan: GardenPlan,
  firstId: string,
  secondId: string,
  { climate = null, today = new Date() }: EditOptions = {},
): GardenPlan {
  const first = plan.layout.plants.find((plant) => plant.id === firstId);
  const second = plan.layout.plants.find((plant) => plant.id === secondId);
  if (!first || !second || first.id === second.id) {
    return plan;
  }

  // Each group takes the other's slot, including its share of that bed, so every bed's
  // shares still sum to one whether the swap is within a bed or across beds.
  const slot = (plant: Plant) => ({ bedId: plant.bedId, x: plant.x, y: plant.y, areaShare: plant.areaShare });
  const plants = plan.layout.plants.map((plant) => {
    if (plant.id === first.id) return { ...plant, ...slot(second) };
    if (plant.id === second.id) return { ...plant, ...slot(first) };
    return plant;
  });
  return finishEdit(plan, plants, plan.alternatives, climate, today);
}
