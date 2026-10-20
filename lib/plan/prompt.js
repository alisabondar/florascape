import { authoritativeGeometry, normalizePlannerInput } from "./shared";

export function climateContextBlock(climate) {
  if (!climate) {
    return "";
  }

  const lines = [`- USDA hardiness zone: ${climate.hardinessZone}`];
  if (climate.frost) {
    lines.push(
      `- Median last spring frost (MM-DD): ${climate.frost.lastSpringFrost || "none recorded"}`,
      `- Median first fall frost (MM-DD): ${climate.frost.firstFallFrost || "none recorded"}`,
      `- Growing season length: ${climate.frost.growingSeasonDays} days`,
    );
  }
  if (climate.forecast) {
    lines.push(
      climate.forecast.frostWarning
        ? `- Forecast frost warning: frost expected on ${climate.forecast.frostDays.join(", ")}. Do not recommend planting frost-tender plants outdoors before then.`
        : "- Forecast frost warning: none in the next 7 days.",
    );
  }

  return `
Authoritative climate context (from USDA zone data and Open-Meteo weather records):
${lines.join("\n")}
Use this climate context instead of inferring climate, zone, or frost dates from the ZIP code. Base whenToPlant, timingLabel, and timingDetails on these frost dates and the current date.
`;
}

export function buildGardenPlanGenerationPrompt(plannerInput, currentDate, climate = null) {
  const input = normalizePlannerInput(plannerInput);
  if (!input) {
    return null;
  }

  const geometry = authoritativeGeometry(
    input,
    input.gardenType === "any" ? "raised_beds" : input.gardenType,
  );
  const areaRequirements =
    input.gardenType === "any"
      ? input.units.map((unit) => ({
          id: unit.id,
          name: unit.name,
          width: unit.width,
          height: unit.length,
          sunExposure: unit.sunExposure,
        }))
      : geometry.beds.map((bed) => ({
          id: bed.id,
          name: bed.name,
          width: bed.width,
          height: bed.height,
          sunExposure: bed.sunExposure || geometry.garden.sunExposure,
        }));
  const containerInstructions =
    input.gardenType === "containers"
      ? `Container-specific requirements:
- Infer a commonly used container type for the climate associated with ZIP ${input.zipCode}. Do not imply live sales data; briefly state the regional gardening reason.
- Explain setup steps, a sensible finished-compost ratio, appropriate potting mix, and drainage practices.
- Include the container guidance in tips.containerSetup.`
      : input.gardenType === "any"
        ? `If recommendedGardenType is containers, provide complete regional setup, compost, potting-mix, and drainage guidance in tips.containerSetup. Otherwise set tips.containerSetup.applicable to false and use empty strings/arrays for its remaining fields.`
        : "Set tips.containerSetup.applicable to false and use empty strings/arrays for its remaining fields.";

  return `You are a practical garden planner for a beginner gardener.

Current date: ${currentDate}
Planner input:
${JSON.stringify(input, null, 2)}

Authoritative growing areas:
${JSON.stringify(areaRequirements, null, 2)}
${climateContextBlock(climate)}
Create one cohesive garden plan and return JSON matching the supplied response schema.

Rules:
- Always set recommendedGardenType. When the submitted gardenType is “any”, choose in_ground, raised_beds, or containers based on the available-area dimensions, sunlight, climate, preferences, accessibility, setup effort, and beginner success. Explain the recommendation naturally in the summary. When a specific type was submitted, recommendedGardenType must match it.
- Use every authoritative growing-area ID exactly as provided. Do not add or remove growing areas.
- Return plant recommendations in layout.plants only. The server owns all bed dimensions, coordinates, and drawing geometry.
- Assign every plant group to one of the exact growing-area IDs.
- Choose realistic plants for the ZIP, current date, selected categories, light, dimensions, and preferences.
- Treat the free-form preferences as strong intent, not decorative context. Identify words or phrases that name specific plants, crops, cultivars, or plant uses and interpret the nearby language around each one (for example enthusiasm, avoidance, intended use, or a request for help).
- When the gardener names a specific plant, include it when it fits the submitted space and conditions. If it does not fit, give a concise reason or safer alternative in tips.preferenceHelp instead of silently ignoring it.
- Detect help-seeking language such as past failure, uncertainty, poor results, or an explicit request for advice. Add targeted, plant-specific prevention and troubleshooting to tips.preferenceHelp for every plant connected to that request. Keep this behavior generic; do not assume any particular plant names.
- Give every plant group a placementReason of at most 12 words, such as sun fit, shade fit, airflow, or proximity to a companion.
- Treat each plant quantity as the target number of healthy mature plants that fits the assigned area, not the number of seeds in a packet.
- Include quantities and seed spacing that realistically fit each area. Use the whole area: plan enough plants at mature spacing to fill each growing area rather than leaving open soil. The server fills every zone to its spacing capacity.
- Give every growing area of at least 8 square feet at least 3 plant groups, and every smaller area at least 1.
- In alternatives, list 5 to 6 other plants per growing area ID that also suit that area's sunlight, the selected categories, the preferences, and the current season. Do not repeat plants already assigned to that area. Keep each reason under 8 words.
- For every plantingGuide item, explain how many seeds to start or sow in sowingAmount. Recommend a modest germination buffer and thinning where appropriate. Only suggest sowing a whole packet when that is sensible for small direct-sown seed, the available area, and succession timing.
- Provide one plantingGuide item per unique plant. Use now, next_month, or next_season for whenToPlant, and make timingLabel explicit and calendar-friendly, such as “Plant this fall” or “Plant next spring”; never display “Plant next season.” Add a concise timing explanation.
- Only include plantingDepth or watering when the advice is meaningfully specific to that plant. Otherwise return an empty string because universal seed-depth and establishment-watering advice is shown once above the guide.
- Tips must cover beneficial neighbors, combinations to avoid, overwatering versus underwatering signs, low-water plants when appropriate, and common beginner mistakes.
- Do not present gardening folklore or weak companion-planting claims as proven fact; use cautious language and favor spacing, airflow, light, and water explanations.
- When no authoritative climate context is provided, state uncertainty briefly because ZIP alone cannot determine a precise frost date or local practice.
- Keep advice concise, friendly, and actionable.
- Do not recommend invasive plants without a containment warning.

${containerInstructions}`;
}
