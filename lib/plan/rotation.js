import { findPlantFacts } from "../plant-facts";

export const MAX_SAVED_SEASONS = 8;
export const ROTATION_ORDER = ["fruiting", "legume", "leafy", "root"];
export const ROTATION_GROUP_LABELS = {
  fruiting: "fruiting crops (tomatoes, peppers, squash)",
  legume: "legumes (beans, peas)",
  leafy: "leafy crops and brassicas",
  root: "root crops and alliums",
};
const MAX_ROTATION_SWAPS = 3;

function rotationGroupOf(name) {
  return findPlantFacts(name)?.rotationGroup || "none";
}

const sameName = (left, right) => String(left || "").trim().toLowerCase() === String(right || "").trim().toLowerCase();

export function seasonLabel(date = new Date()) {
  const month = date.getMonth();
  const season = month <= 1 || month === 11 ? "Winter" : month <= 4 ? "Spring" : month <= 7 ? "Summer" : "Fall";
  // December belongs to the winter that continues into the next year's label.
  return `${season} ${month === 11 ? date.getFullYear() + 1 : date.getFullYear()}`;
}

/** Areas and plants of a plan, as stored in the season history. */
export function snapshotSeason({ plan, planId, zipCode, now = new Date() }) {
  return {
    id: `season-${now.getTime().toString(36)}`,
    planId,
    savedAt: now.toISOString(),
    label: seasonLabel(now),
    zipCode: zipCode || "",
    areas: plan.layout.beds.map((bed) => ({
      name: bed.name,
      plants: plan.layout.plants
        .filter((plant) => plant.bedId === bed.id)
        .map((plant) => ({
          name: plant.name,
          family: findPlantFacts(plant.name)?.family || "",
          rotationGroup: rotationGroupOf(plant.name),
        })),
    })),
  };
}

/** Newest first, at most eight; saving the same plan again replaces its earlier entry. */
export function addSeason(history, season) {
  return [season, ...(history || []).filter((entry) => entry.planId !== season.planId)].slice(0, MAX_SAVED_SEASONS);
}

export function removeSeason(history, seasonId) {
  return (history || []).filter((entry) => entry.id !== seasonId);
}

/** The most recent saved season that is not the current plan. */
export function previousSeason(history, planId) {
  return (history || []).find((entry) => entry.planId !== planId) || null;
}

export function nextRotationGroup(group) {
  const index = ROTATION_ORDER.indexOf(group);
  return index === -1 ? null : ROTATION_ORDER[(index + 1) % ROTATION_ORDER.length];
}

function dominantGroup(plants) {
  const counts = new Map();
  plants.forEach((plant) => {
    if (plant.rotationGroup !== "none") {
      counts.set(plant.rotationGroup, (counts.get(plant.rotationGroup) || 0) + 1);
    }
  });
  // Ties resolve in rotation order so the result is stable.
  return ROTATION_ORDER.filter((group) => counts.has(group)).sort((a, b) => counts.get(b) - counts.get(a))[0] || null;
}

/**
 * For each area (matched to the earlier season by name), plants repeating a rotation group,
 * the group to aim for next, and swaps toward it from the area's alternatives.
 */
export function rotationCheck(plan, season) {
  if (!plan?.layout || !season) {
    return [];
  }
  return plan.layout.beds
    .map((bed) => {
      const earlierArea = season.areas.find((area) => sameName(area.name, bed.name));
      if (!earlierArea) {
        return null;
      }
      const plants = plan.layout.plants.filter((plant) => plant.bedId === bed.id);
      const repeats = plants
        .map((plant) => {
          const group = rotationGroupOf(plant.name);
          const earlier = group === "none" ? null : earlierArea.plants.find((item) => item.rotationGroup === group);
          return earlier ? { plantId: plant.id, plant: plant.name, group, earlierPlant: earlier.name } : null;
        })
        .filter(Boolean);
      if (!repeats.length) {
        return null;
      }

      const lastGroup = dominantGroup(earlierArea.plants);
      const recommendedGroup = nextRotationGroup(lastGroup);
      const candidates = (plan.alternatives?.[bed.id] || []).filter(
        (item) =>
          rotationGroupOf(item.name) === recommendedGroup &&
          !plants.some((plant) => sameName(plant.name, item.name)),
      );
      const suggestions = repeats.slice(0, MAX_ROTATION_SWAPS).flatMap((repeat, index) =>
        candidates[index] ? [{ plantId: repeat.plantId, from: repeat.plant, replacement: candidates[index].name }] : [],
      );

      return { bedId: bed.id, bedName: bed.name, repeats, lastGroup, recommendedGroup, suggestions };
    })
    .filter(Boolean);
}
