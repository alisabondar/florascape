import { allocatePlantZones, plantZoneWeights } from "../garden-layout";
import { clampSpacingToFacts, findPlantFacts, PLANT_FACTS } from "../plant-facts";
import { MAX_PLANT_QUANTITY } from "../planner-config";

const MIN_GROUPS_LARGE_AREA = 3;
const LARGE_AREA_SQ_FT = 8;
const MIN_ALTERNATIVES = 5;
const MAX_ALTERNATIVES = 8;
const REFERENCE_YEAR = 2001;

function slug(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function sameName(left, right) {
  return String(left || "").trim().toLowerCase() === String(right || "").trim().toLowerCase();
}

/** Plants per row × rows at the plant's spacing. Circle beds keep only the inscribed share. */
export function zoneCapacity(widthFt, heightFt, spacingInches, shape = "rect") {
  const spacing = Math.max(1, Number(spacingInches) || 8);
  const perRow = Math.max(1, Math.floor((widthFt * 12) / spacing));
  const rows = Math.max(1, Math.floor((heightFt * 12) / spacing));
  const capacity = perRow * rows;
  return Math.max(1, Math.min(MAX_PLANT_QUANTITY, shape === "circle" ? Math.floor(capacity * (Math.PI / 4)) : capacity));
}

function capacitiesForBed(bed, plants) {
  // Same ordering as layoutToSvgModel so capacities match the drawn zones.
  const ordered = [...plants].sort((left, right) =>
    bed.width >= bed.height ? left.x - right.x : left.y - right.y,
  );
  const zones = allocatePlantZones(bed, ordered);
  return new Map(
    zones.map((zone) => {
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
export function fillLayoutToCapacity(layout) {
  const plants = layout.beds.flatMap((bed) => {
    const bedPlants = layout.plants.filter((plant) => plant.bedId === bed.id);
    const weights = plantZoneWeights(bedPlants);
    const total = weights.reduce((sum, weight) => sum + weight, 0) || 1;
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

export function bedSunLevel(bed, garden) {
  if (bed.sunExposure) {
    return bed.sunExposure;
  }
  return garden?.sunniestSide === "fully_shaded" ? "mostly_shade" : "full_sun";
}

function sunFits(plantSun, bedSun) {
  if (bedSun === "full_sun") {
    return plantSun === "full_sun" || plantSun === "partial_shade";
  }
  if (bedSun === "partial_shade") {
    return plantSun === "partial_shade" || plantSun === "shade";
  }
  return plantSun === "shade" || plantSun === "partial_shade";
}

function categoryFits(fact, plantTypes) {
  if (!plantTypes?.length) {
    return true;
  }
  return plantTypes.includes(fact.category) || (plantTypes.includes("basic") && fact.easyCare);
}

function dayOfYear(date) {
  return Math.round(
    (Date.UTC(REFERENCE_YEAR, date.getUTCMonth(), date.getUTCDate()) - Date.UTC(REFERENCE_YEAR, 0, 1)) /
      86400000,
  );
}

function monthDayToDayOfYear(monthDay) {
  if (!monthDay) {
    return null;
  }
  const [month, day] = monthDay.split("-").map(Number);
  return dayOfYear(new Date(Date.UTC(REFERENCE_YEAR, month - 1, day)));
}

function isFrostSeason(climate, today) {
  if (climate?.forecast?.frostWarning) {
    return true;
  }
  const lastSpring = monthDayToDayOfYear(climate?.frost?.lastSpringFrost);
  const firstFall = monthDayToDayOfYear(climate?.frost?.firstFallFrost);
  const now = dayOfYear(today);
  return (lastSpring !== null && now < lastSpring) || (firstFall !== null && now >= firstFall);
}

function mentionedInPreferences(fact, preferences) {
  const text = String(preferences || "").toLowerCase();
  return [fact.name, ...fact.aliases].some((name) => text.includes(name.toLowerCase()));
}

/** Plant-facts entries suited to a bed's sun, the chosen categories, and the season. */
export function suitablePlantFacts(bed, { garden, plantTypes, preferences, climate, today = new Date() }) {
  const bedSun = bedSunLevel(bed, garden);
  const frostSeason = isFrostSeason(climate, today);
  return PLANT_FACTS.filter(
    (fact) =>
      sunFits(fact.sunNeeds, bedSun) &&
      categoryFits(fact, plantTypes) &&
      !(frostSeason && fact.frostTolerance === "tender"),
  ).sort(
    (left, right) =>
      Number(mentionedInPreferences(right, preferences)) - Number(mentionedInPreferences(left, preferences)),
  );
}

function plantFromFact(fact, bedId, index) {
  return {
    id: `plant-${bedId}-${index}-${slug(fact.name)}`,
    name: fact.name,
    bedId,
    x: 0,
    y: 0,
    spacingInches: Math.round((fact.spacingInches.min + fact.spacingInches.max) / 2),
    quantity: 1,
    sunNeeds: fact.sunNeeds,
    placementReason: "Added to use this area's open space.",
  };
}

/** Adds plant-facts groups to any area with fewer groups than its size calls for. */
export function topUpPlantGroups(layout, context) {
  const added = [];
  layout.beds.forEach((bed) => {
    const bedPlants = layout.plants.filter((plant) => plant.bedId === bed.id);
    const minimum = bed.width * bed.height >= LARGE_AREA_SQ_FT ? MIN_GROUPS_LARGE_AREA : 1;
    const candidates = suitablePlantFacts(bed, { ...context, garden: layout.garden }).filter(
      (fact) => !bedPlants.some((plant) => sameName(plant.name, fact.name)),
    );
    // If filters leave nothing, any unused plant still beats an empty area.
    const pool = candidates.length
      ? candidates
      : PLANT_FACTS.filter((fact) => !bedPlants.some((plant) => sameName(plant.name, fact.name)));
    // Size new groups like an average existing group so they get a fair share of the area.
    const weights = plantZoneWeights(bedPlants);
    const averageWeight = weights.length
      ? weights.reduce((sum, weight) => sum + weight, 0) / weights.length
      : 1;
    for (let index = bedPlants.length; index < minimum && pool.length; index += 1) {
      const plant = plantFromFact(pool.shift(), bed.id, index + 1);
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

function alternativeFromFact(fact, source = "facts") {
  return {
    name: fact.name,
    spacingInches: Math.round((fact.spacingInches.min + fact.spacingInches.max) / 2),
    sunNeeds: fact.sunNeeds,
    reason: fact.easyCare ? "Easy-care fit for this area." : "Suits this area's light and season.",
    source,
  };
}

/**
 * Builds each area's alternatives: model suggestions first, then plant-facts picks,
 * excluding plants already in the area, until there are at least five.
 */
export function buildAlternatives(layout, rawAlternatives, context) {
  const byBed = {};
  layout.beds.forEach((bed) => {
    const inBed = layout.plants.filter((plant) => plant.bedId === bed.id);
    const list = [];
    const add = (alternative) => {
      if (
        alternative?.name &&
        list.length < MAX_ALTERNATIVES &&
        !list.some((item) => sameName(item.name, alternative.name)) &&
        !inBed.some((plant) => sameName(plant.name, alternative.name))
      ) {
        list.push(alternative);
      }
    };

    const fromModel = (Array.isArray(rawAlternatives) ? rawAlternatives : []).find(
      (entry) => entry?.bedId === bed.id,
    );
    (Array.isArray(fromModel?.plants) ? fromModel.plants : []).forEach((plant) => {
      const name = String(plant?.name || "").trim();
      const spacing = Number(plant?.spacingInches) > 0 ? Number(plant.spacingInches) : 8;
      add({
        name,
        spacingInches: Math.round(clampSpacingToFacts(name, spacing)),
        sunNeeds: ["full_sun", "partial_shade", "shade"].includes(plant?.sunNeeds)
          ? plant.sunNeeds
          : findPlantFacts(name)?.sunNeeds || "partial_shade",
        reason: String(plant?.reason || "").trim() || "Recommended for this area.",
        source: "ai",
      });
    });

    suitablePlantFacts(bed, { ...context, garden: layout.garden }).forEach((fact) =>
      add(alternativeFromFact(fact)),
    );
    // Relax the filters only if the area still has too few options.
    if (list.length < MIN_ALTERNATIVES) {
      PLANT_FACTS.forEach((fact) => add(alternativeFromFact(fact)));
    }
    byBed[bed.id] = list;
  });
  return byBed;
}

function formatMonthDay(monthDay) {
  const [month, day] = monthDay.split("-").map(Number);
  return new Date(Date.UTC(REFERENCE_YEAR, month - 1, day)).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

function seasonName(doy) {
  if (doy < 59 || doy >= 334) return "winter";
  if (doy < 151) return "spring";
  if (doy < 243) return "summer";
  return "fall";
}

/** Chooses now / next_month / next_season from frost tolerance and the local frost dates. */
export function plantingWindowFromFacts(fact, climate, today = new Date()) {
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

  const earlyOffset = fact.frostTolerance === "hardy" ? 42 : fact.frostTolerance === "semi_hardy" ? 14 : 0;
  const lateOffset = tender ? 0 : earlyOffset;
  const start = (lastSpring ?? 0) - earlyOffset;
  const end = (firstFall ?? 365) - fact.daysToMaturity + lateOffset;
  const frostNote = tender
    ? `Frost-tender: plant after the last spring frost${climate.frost.lastSpringFrost ? ` (around ${formatMonthDay(climate.frost.lastSpringFrost)})` : ""}.`
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

export function guideEntryFromFacts(plantName, quantity, climate, today = new Date()) {
  const fact = findPlantFacts(plantName);
  const spacing = fact ? Math.round((fact.spacingInches.min + fact.spacingInches.max) / 2) : 8;
  const timing = fact
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
    notes: fact ? `About ${fact.daysToMaturity} days to maturity.` : "",
  };
}

/** Keeps guide entries for plants still in the layout, updates quantities, and adds missing ones. */
export function syncPlantingGuide(plantingGuide, plants, climate, today = new Date()) {
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

function withSwappedOut(alternatives, bedId, removedPlants, addedNames) {
  const current = (alternatives?.[bedId] || []).filter(
    (item) => !addedNames.some((name) => sameName(name, item.name)),
  );
  const returned = removedPlants
    .filter((plant) => !current.some((item) => sameName(item.name, plant.name)))
    .map((plant) => ({
      name: plant.name,
      spacingInches: plant.spacingInches,
      sunNeeds: plant.sunNeeds,
      reason: plant.placementReason,
      source: "plan",
    }));
  return { ...alternatives, [bedId]: [...current, ...returned] };
}

function applyAlternative(plant, alternative) {
  return {
    ...plant,
    id: `${plant.id.split("--")[0]}--${slug(alternative.name)}`,
    name: alternative.name,
    spacingInches: Math.round(clampSpacingToFacts(alternative.name, alternative.spacingInches || 8)),
    sunNeeds: alternative.sunNeeds,
    placementReason: alternative.reason,
  };
}

function finishEdit(plan, plants, alternatives, climate, today) {
  const layout = fillLayoutToCapacity({ ...plan.layout, plants });
  return {
    ...plan,
    layout,
    alternatives,
    plantingGuide: syncPlantingGuide(plan.plantingGuide, layout.plants, climate, today),
  };
}

/** Replaces one plant group with an alternative from its area; the old plant becomes an alternative. */
export function swapPlant(plan, plantId, alternativeName, { climate = null, today = new Date() } = {}) {
  const target = plan.layout.plants.find((plant) => plant.id === plantId);
  const alternative = plan.alternatives?.[target?.bedId]?.find((item) =>
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
export function shufflePlan(plan, { climate = null, today = new Date(), random = Math.random } = {}) {
  let alternatives = { ...plan.alternatives };
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
export function completePlanLayout(layout, rawAlternatives, input, { climate = null, today = new Date() } = {}) {
  const context = {
    plantTypes: input.plantTypes,
    preferences: input.preferences,
    climate,
    today,
  };
  const filled = fillLayoutToCapacity(topUpPlantGroups(layout, context));
  return { layout: filled, alternatives: buildAlternatives(filled, rawAlternatives, context) };
}
