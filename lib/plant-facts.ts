import plantFacts from "./plant-facts.json";
import type { PlantFact } from "./types";

// The JSON import widens string unions; the file is curated to match PlantFact.
const PLANT_FACTS_LIST = plantFacts.plants as PlantFact[];

const FACTS_BY_NAME = new Map<string, PlantFact>();
for (const fact of PLANT_FACTS_LIST) {
  for (const name of [fact.name, ...fact.aliases]) {
    FACTS_BY_NAME.set(name.trim().toLowerCase(), fact);
  }
}

export const PLANT_FACTS: PlantFact[] = PLANT_FACTS_LIST;

export function findPlantFacts(name: unknown): PlantFact | null {
  return FACTS_BY_NAME.get(String(name || "").trim().toLowerCase()) || null;
}

export function clampSpacingToFacts(name: unknown, spacingInches: number): number {
  const fact = findPlantFacts(name);
  if (!fact) {
    return spacingInches;
  }

  const { min, max } = fact.spacingInches;
  return Math.min(max, Math.max(min, spacingInches));
}
