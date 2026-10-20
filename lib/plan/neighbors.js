import companions from "../companions.json";
import { findPlantFacts } from "../plant-facts";

function canonical(name) {
  return (findPlantFacts(name)?.name || String(name || "")).trim().toLowerCase();
}

function matches(ruleName, plantName) {
  return ruleName === "*" || canonical(ruleName) === canonical(plantName);
}

/**
 * Helpful pairs and conflicts among the plants sharing each growing area. A "*" rule
 * (such as mint) applies to any other plant in the same area.
 */
export function checkNeighbors(layout) {
  return layout.beds
    .map((bed) => {
      const names = [];
      layout.plants
        .filter((plant) => plant.bedId === bed.id)
        .forEach((plant) => {
          if (!names.some((name) => canonical(name) === canonical(plant.name))) {
            names.push(plant.name);
          }
        });

      const findings = [];
      companions.pairs.forEach((pair) => {
        for (let left = 0; left < names.length; left += 1) {
          for (let right = left + 1; right < names.length; right += 1) {
            const [first, second] = [names[left], names[right]];
            const forward = matches(pair.a, first) && matches(pair.b, second);
            const backward = matches(pair.a, second) && matches(pair.b, first);
            if (!forward && !backward) {
              continue;
            }
            const plants = forward ? [first, second] : [second, first];
            const key = `${pair.type}:${pair.b === "*" ? plants[0] : plants.map(canonical).sort().join("+")}`;
            if (!findings.some((item) => item.key === key)) {
              findings.push({
                key,
                type: pair.type,
                plants: pair.b === "*" ? [plants[0]] : plants,
                reason: pair.reason,
              });
            }
          }
        }
      });

      return {
        bedId: bed.id,
        bedName: bed.name,
        helpful: findings.filter((item) => item.type === "helpful"),
        conflicts: findings.filter((item) => item.type === "conflict"),
      };
    })
    .filter((area) => area.helpful.length || area.conflicts.length);
}
