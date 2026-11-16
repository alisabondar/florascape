import { findPlantFacts, PLANT_FACTS } from "./plant-facts";
import type { AreaSunExposure, ClimateContext, Layout, Plant } from "./types";

/** Where a plant group is in its season during one month. */
export type SeasonStage = "empty" | "planted" | "growing" | "harvest" | "done";

export const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

/** Months (0 = Jan) a plant group goes in, starts producing, and finishes. */
export interface PlantSeason {
  plantId: string;
  plantMonth: number;
  harvestMonth: number;
  endMonth: number;
}

export interface SeasonTimeline {
  /** The months worth scrubbing through, in order (first planting to the month after the last harvest). */
  months: number[];
  byPlant: Map<string, PlantSeason>;
  /** Seasons of follow-up crops, by the id of the plant group whose zone they take over. */
  followUps: Map<string, PlantSeason>;
}

// Typical frost dates (about USDA zone 6) when the plan has no climate data.
const DEFAULT_LAST_SPRING = 105; // Apr 15
const DEFAULT_FIRST_FALL = 288; // Oct 15
const MONTH_START = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];

function monthOfDay(day: number): number {
  const clamped = Math.max(0, Math.min(364, Math.round(day)));
  let month = 0;
  while (month < 11 && MONTH_START[month + 1] <= clamped) {
    month += 1;
  }
  return month;
}

function dayOfMonthDay(monthDay: string | null | undefined): number | null {
  if (!monthDay) {
    return null;
  }
  const [month, day] = monthDay.split("-").map(Number);
  return month >= 1 && month <= 12 ? MONTH_START[month - 1] + (day || 1) - 1 : null;
}

/** Frost dates as day-of-year; a climate with frost data but no dates means frost is rare. */
function frostDays(climate: ClimateContext | null | undefined) {
  const lastSpring = dayOfMonthDay(climate?.frost?.lastSpringFrost);
  const firstFall = dayOfMonthDay(climate?.frost?.firstFallFrost);
  if (climate?.frost && lastSpring === null && firstFall === null) {
    return { lastSpring: 31, firstFall: 334 };
  }
  return { lastSpring: lastSpring ?? DEFAULT_LAST_SPRING, firstFall: firstFall ?? DEFAULT_FIRST_FALL };
}

/**
 * One plant group's season from its facts: hardier plants go in weeks before the last
 * spring frost, tender ones a week after; harvest starts after its days to maturity.
 * Fruiting crops, beans, herbs and flowers keep producing until fall frost; leafy and
 * root crops are picked over about five weeks.
 */
export function plantSeason(plant: Pick<Plant, "id" | "name">, climate: ClimateContext | null | undefined): PlantSeason {
  const { lastSpring } = frostDays(climate);
  const tolerance = findPlantFacts(plant.name)?.frostTolerance ?? "semi_hardy";
  const plantDay = tolerance === "hardy" ? lastSpring - 42 : tolerance === "semi_hardy" ? lastSpring - 14 : lastSpring + 7;
  return seasonFrom(plant.id, plant.name, plantDay, climate);
}

/** A season for `name` planted on `plantDay` (day of year). */
function seasonFrom(plantId: string, name: string, plantDay: number, climate: ClimateContext | null | undefined): PlantSeason {
  const fact = findPlantFacts(name);
  const { firstFall } = frostDays(climate);
  const tolerance = fact?.frostTolerance ?? "semi_hardy";
  const harvestDay = plantDay + (fact?.daysToMaturity ?? 60);
  const group = fact?.rotationGroup ?? "none";
  // Cool-season peas and favas stop in summer heat, like leafy and root crops.
  const shortHarvest = group === "leafy" || group === "root" || (group === "legume" && tolerance !== "tender");
  const endDay = shortHarvest ? harvestDay + 35 : Math.max(harvestDay + 21, firstFall + (tolerance === "hardy" ? 21 : 0));
  const plantMonth = monthOfDay(plantDay);
  const harvestMonth = Math.max(plantMonth + 1, monthOfDay(harvestDay));
  return {
    plantId,
    plantMonth,
    harvestMonth: Math.min(11, harvestMonth),
    endMonth: Math.min(11, Math.max(harvestMonth, monthOfDay(endDay))),
  };
}

export function seasonStage(season: PlantSeason, month: number): SeasonStage {
  if (month < season.plantMonth) return "empty";
  if (month === season.plantMonth) return "planted";
  if (month < season.harvestMonth) return "growing";
  if (month <= season.endMonth) return "harvest";
  return "done";
}

/** The middle of a month, as a day of year. */
const midMonth = (month: number) => MONTH_START[Math.max(0, Math.min(11, month))] + 14;

/** A follow-up crop's season: sown the month after the first crop finishes. */
export function followUpSeason(first: PlantSeason, name: string, climate: ClimateContext | null | undefined): PlantSeason {
  return seasonFrom(first.plantId, name, midMonth(first.endMonth + 1), climate);
}

export function seasonTimeline(layout: Pick<Layout, "plants">, climate: ClimateContext | null | undefined): SeasonTimeline {
  const byPlant = new Map(layout.plants.map((plant) => [plant.id, plantSeason(plant, climate)]));
  const followUps = new Map<string, PlantSeason>();
  layout.plants.forEach((plant) => {
    const first = byPlant.get(plant.id);
    if (plant.followUp && first && first.endMonth < 11) {
      followUps.set(plant.id, followUpSeason(first, plant.followUp.name, climate));
    }
  });
  const seasons = [...byPlant.values(), ...followUps.values()];
  if (!seasons.length) {
    return { months: [], byPlant, followUps };
  }
  const first = Math.min(...seasons.map((season) => season.plantMonth));
  const last = Math.min(11, Math.max(...seasons.map((season) => season.endMonth)) + 1);
  return { months: Array.from({ length: last - first + 1 }, (_, index) => first + index), byPlant, followUps };
}

/** What a plant group's zone holds in a month: the first crop, or its follow-up once that's sown. */
export interface PatchState {
  name: string;
  spacingInches: number;
  quantity: number;
  stage: SeasonStage;
  followUp: boolean;
}

export function patchState(
  plant: Pick<Plant, "id" | "name" | "spacingInches" | "quantity" | "followUp">,
  timeline: SeasonTimeline,
  month: number,
): PatchState {
  const next = timeline.followUps.get(plant.id);
  if (plant.followUp && next && month >= next.plantMonth) {
    return { ...plant.followUp, stage: seasonStage(next, month), followUp: true };
  }
  const first = timeline.byPlant.get(plant.id);
  return {
    name: plant.name,
    spacingInches: plant.spacingInches,
    quantity: plant.quantity,
    stage: first ? seasonStage(first, month) : "empty",
    followUp: false,
  };
}

/**
 * The month to open on: this month while something is planted, growing, or ready;
 * otherwise (before the season or after it ends) the first planting month.
 */
export function startingMonth(timeline: SeasonTimeline, today: Date = new Date()): number {
  const current = today.getMonth();
  const active = [...timeline.byPlant.values()].some((season) => {
    const stage = seasonStage(season, current);
    return stage !== "empty" && stage !== "done";
  });
  return timeline.months.includes(current) && active ? current : timeline.months[0] ?? current;
}

/** What to do in a month, grouped by stage, as plant names (each listed once). */
export function monthTasks(layout: Pick<Layout, "plants">, timeline: SeasonTimeline, month: number) {
  const states = layout.plants.map((plant) => patchState(plant, timeline, month));
  const names = (stage: SeasonStage) => [...new Set(states.filter((state) => state.stage === stage).map((state) => state.name))];
  return { plant: names("planted"), pick: names("harvest"), free: names("done"), growing: names("growing") };
}

export interface FollowUpOption {
  name: string;
  daysToMaturity: number;
  spacingInches: number;
}

const SUN_RANK = { shade: 0, partial_shade: 1, full_sun: 2 } as const;
const PERENNIALS = new Set(["strawberry", "rosemary", "thyme", "sage", "oregano", "mint", "lavender", "chives", "tarragon", "lemon balm", "hosta", "echinacea", "yarrow", "hyssop", "lemongrass"]);

/**
 * Crops that can go into a zone once its first crop is done and still mature before the
 * fall frost (hardier crops get a few extra weeks), quickest first. Skips the same crop
 * family (crop rotation) and plants that need more sun than the bed gets.
 */
export function followUpOptions(
  plant: Pick<Plant, "id" | "name">,
  timeline: SeasonTimeline,
  climate: ClimateContext | null | undefined,
  bedSun?: AreaSunExposure | string | null,
  limit = 4,
): FollowUpOption[] {
  const first = timeline.byPlant.get(plant.id);
  if (!first || first.endMonth >= 10) {
    return [];
  }
  const firstFact = findPlantFacts(plant.name);
  const { firstFall } = frostDays(climate);
  const plantDay = midMonth(first.endMonth + 1);
  const sunCap = bedSun && bedSun in SUN_RANK ? SUN_RANK[bedSun as keyof typeof SUN_RANK] : 2;
  // Summer sowings suit heat-loving crops; from August on, hardy fall crops.
  const prefers = (fact: (typeof PLANT_FACTS)[number]) =>
    first.endMonth + 1 >= 7 ? fact.frostTolerance !== "tender" : fact.frostTolerance === "tender";
  const fits = PLANT_FACTS.filter((fact) => {
    if (fact.name === firstFact?.name || fact.name.toLowerCase() === plant.name.toLowerCase()) return false;
    // Perennials stay put for years, so they're no follow-up crop.
    if (PERENNIALS.has(fact.name.toLowerCase())) return false;
    if (firstFact && fact.family === firstFact.family) return false;
    if (firstFact && fact.category !== firstFact.category) return false;
    if (SUN_RANK[fact.sunNeeds] > sunCap) return false;
    const grace = fact.frostTolerance === "hardy" ? 28 : fact.frostTolerance === "semi_hardy" ? 14 : 0;
    return plantDay + fact.daysToMaturity <= firstFall + grace;
  })
    .sort(
      (left, right) =>
        Number(prefers(right)) - Number(prefers(left)) ||
        left.daysToMaturity - right.daysToMaturity ||
        Number(right.easyCare) - Number(left.easyCare),
    );
  // One per crop type first (greens, roots, fruiting...), then fill up, so the choices vary.
  const picked: typeof fits = [];
  fits.forEach((fact) => {
    if (picked.length < limit && !picked.some((item) => item.rotationGroup === fact.rotationGroup)) picked.push(fact);
  });
  fits.forEach((fact) => {
    if (picked.length < limit && !picked.includes(fact) && !picked.some((item) => item.family === fact.family)) picked.push(fact);
  });
  fits.forEach((fact) => {
    if (picked.length < limit && !picked.includes(fact)) picked.push(fact);
  });
  return picked
    .sort((left, right) => left.daysToMaturity - right.daysToMaturity)
    .map((fact) => ({ name: fact.name, daysToMaturity: fact.daysToMaturity, spacingInches: fact.spacingInches.max }));
}

/** How to save seeds from a finished crop, in a sentence or two. */
export function seedSavingTip(name: string): { canSaveNow: boolean; tip: string } {
  const fact = findPlantFacts(name);
  const plantName = (fact?.name || name).toLowerCase();
  if (plantName === "garlic" || plantName === "shallot" || plantName === "potato" || plantName === "sweet potato") {
    return { canSaveNow: true, tip: "Keep a few of the biggest, healthiest ones to replant instead of buying new." };
  }
  const twoYear =
    fact?.family === "Amaranthaceae" && plantName !== "spinach" ||
    (fact?.family === "Apiaceae" && ["carrot", "parsnip", "celery", "parsley"].includes(plantName)) ||
    (fact?.family === "Amaryllidaceae" && ["onion", "leek"].includes(plantName)) ||
    (fact?.family === "Brassicaceae" && !["radish", "arugula", "mustard greens", "bok choy"].includes(plantName));
  if (twoYear) {
    return { canSaveNow: false, tip: "A two-year crop: it only flowers next spring, so seeds come in year two. Buy fresh seed for now." };
  }
  if (fact?.rotationGroup === "fruiting") {
    return { canSaveNow: true, tip: "Scoop seeds from one or two ripe fruits, rinse, and dry them on a plate for a week. Works for open-pollinated varieties, not F1 hybrids." };
  }
  return { canSaveNow: true, tip: "Let two or three of the best plants flower and dry on the stem, then shake the seeds into a paper envelope. Works for open-pollinated varieties, not F1 hybrids." };
}
