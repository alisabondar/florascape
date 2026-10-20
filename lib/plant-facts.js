import plantFacts from "./plant-facts.json";

const FACTS_BY_NAME = new Map();
for (const fact of plantFacts.plants) {
  for (const name of [fact.name, ...fact.aliases]) {
    FACTS_BY_NAME.set(name.trim().toLowerCase(), fact);
  }
}

export const PLANT_FACTS = plantFacts.plants;

export function findPlantFacts(name) {
  return FACTS_BY_NAME.get(String(name || "").trim().toLowerCase()) || null;
}

export function clampSpacingToFacts(name, spacingInches) {
  const fact = findPlantFacts(name);
  if (!fact) {
    return spacingInches;
  }

  const { min, max } = fact.spacingInches;
  return Math.min(max, Math.max(min, spacingInches));
}
