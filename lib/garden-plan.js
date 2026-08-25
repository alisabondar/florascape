import {
  getAreaCopy,
  getGardenTypeLabel,
  isGardenType,
} from "./planner-config";

const RECOMMENDED_GARDEN_TYPES = new Set(["in_ground", "raised_beds", "containers"]);
const SUN_LEVELS = new Set(["full_sun", "partial_shade", "mostly_shade"]);
const PLANT_SUN_LEVELS = new Set(["full_sun", "partial_shade", "shade"]);
const PLANTING_WINDOWS = new Set(["now", "next_month", "next_season"]);

const TIP_ITEM_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    detail: { type: "string" },
  },
  required: ["title", "detail"],
};

export const GARDEN_PLAN_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    recommendedGardenType: {
      type: "string",
      enum: ["in_ground", "raised_beds", "containers"],
    },
    summary: { type: "string" },
    layout: {
      type: "object",
      properties: {
        plants: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              name: { type: "string" },
              bedId: { type: "string" },
              spacingInches: { type: "number" },
              quantity: { type: "integer" },
              sunNeeds: {
                type: "string",
                enum: ["full_sun", "partial_shade", "shade"],
              },
              placementReason: { type: "string" },
            },
            required: [
              "id",
              "name",
              "bedId",
              "spacingInches",
              "quantity",
              "sunNeeds",
              "placementReason",
            ],
          },
        },
      },
      required: ["plants"],
    },
    tips: {
      type: "object",
      properties: {
        preferenceHelp: { type: "array", items: TIP_ITEM_SCHEMA },
        companionPlanting: { type: "array", items: TIP_ITEM_SCHEMA },
        avoid: { type: "array", items: TIP_ITEM_SCHEMA },
        watering: { type: "array", items: TIP_ITEM_SCHEMA },
        commonMistakes: { type: "array", items: TIP_ITEM_SCHEMA },
        containerSetup: {
          type: "object",
          properties: {
            applicable: { type: "boolean" },
            popularContainer: { type: "string" },
            popularityReason: { type: "string" },
            setupSteps: { type: "array", items: { type: "string" } },
            compostAdvice: { type: "string" },
            drainageAdvice: { type: "string" },
          },
          required: [
            "applicable",
            "popularContainer",
            "popularityReason",
            "setupSteps",
            "compostAdvice",
            "drainageAdvice",
          ],
        },
      },
      required: [
        "preferenceHelp",
        "companionPlanting",
        "avoid",
        "watering",
        "commonMistakes",
        "containerSetup",
      ],
    },
    plantingGuide: {
      type: "array",
      items: {
        type: "object",
        properties: {
          plantName: { type: "string" },
          whenToPlant: {
            type: "string",
            enum: ["now", "next_month", "next_season"],
          },
          timingLabel: { type: "string" },
          timingDetails: { type: "string" },
          spacingInches: { type: "number" },
          sowingAmount: { type: "string" },
          plantingDepth: { type: "string" },
          watering: { type: "string" },
          notes: { type: "string" },
        },
        required: [
          "plantName",
          "whenToPlant",
          "timingLabel",
          "timingDetails",
          "spacingInches",
          "sowingAmount",
          "plantingDepth",
          "watering",
          "notes",
        ],
      },
    },
  },
  required: ["recommendedGardenType", "summary", "layout", "tips", "plantingGuide"],
};

function finitePositive(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function round(value) {
  return Math.round(value * 100) / 100;
}

function cleanText(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function slugify(value) {
  return String(value || "plant")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "plant";
}

function parseJsonLoose(rawText) {
  if (typeof rawText !== "string") {
    return null;
  }

  const content = rawText.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(content);
  } catch {
    const start = content.indexOf("{");
    const end = content.lastIndexOf("}");
    if (start === -1 || end <= start) {
      return null;
    }
    try {
      return JSON.parse(content.slice(start, end + 1));
    } catch {
      return null;
    }
  }
}

function normalizeSuggestedPlants(rawLayout) {
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
        spacingInches: round(finitePositive(plant?.spacingInches) || 8),
        quantity: Math.max(1, Math.min(80, Math.floor(Number(plant?.quantity) || 1))),
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

export function normalizePlannerInput(raw) {
  if (!raw || !isGardenType(raw.gardenType)) {
    return null;
  }

  const zipCode = String(raw.zipCode || "").trim();
  if (!/^\d{5}$/.test(zipCode)) {
    return null;
  }

  const selectedPlants = Array.isArray(raw.selectedPlants)
    ? raw.selectedPlants.map((item) => cleanText(item)).filter(Boolean).slice(0, 10)
    : [];
  if (!selectedPlants.length) {
    return null;
  }

  const base = {
    zipCode,
    gardenType: raw.gardenType,
    gardenTypeLabel: cleanText(raw.gardenTypeLabel, getGardenTypeLabel(raw.gardenType)),
    plantTypes: Array.isArray(raw.plantTypes) ? raw.plantTypes.slice(0, 10) : [],
    selectedPlants,
    preferences: cleanText(raw.preferences),
    inGround: null,
    units: [],
  };

  if (raw.gardenType === "in_ground") {
    const width = finitePositive(raw?.inGround?.width);
    const length = finitePositive(raw?.inGround?.length);
    const sunniestSide = cleanText(raw?.inGround?.sunniestSide);
    const plotStyle = raw?.inGround?.plotStyle === "sections" ? "sections" : "single";
    const sectionCount =
      plotStyle === "sections"
        ? Math.max(2, Math.min(12, Math.floor(Number(raw?.inGround?.sectionCount) || 2)))
        : 1;

    if (!width || !length || !sunniestSide) {
      return null;
    }

    base.inGround = { width, length, sunniestSide, plotStyle, sectionCount };
    return base;
  }

  const rawUnits = Array.isArray(raw.units) ? raw.units.slice(0, 12) : [];
  const units = rawUnits
    .map((unit, index) => {
      const width = finitePositive(unit?.width);
      const length = finitePositive(unit?.length);
      const sunExposure = cleanText(unit?.sunExposure);
      if (!width || !length || !SUN_LEVELS.has(sunExposure)) {
        return null;
      }
      const areaCopy = getAreaCopy(raw.gardenType);
      return {
        id: `${areaCopy.idPrefix}-${index + 1}`,
        name: `${areaCopy.drawingLabel} ${index + 1}`,
        width,
        length,
        sunExposure,
        sunExposureLabel: cleanText(unit?.sunExposureLabel, sunExposure),
      };
    })
    .filter(Boolean);

  if (!units.length || units.length !== rawUnits.length) {
    return null;
  }

  base.units = units;
  return base;
}

function buildInGroundGeometry(input) {
  const { width, length, sunniestSide, sectionCount } = input.inGround;
  const margin = Math.min(0.4, width * 0.08, length * 0.08);
  const availableWidth = Math.max(0.2, width - margin * 2);
  const availableHeight = Math.max(0.2, length - margin * 2);
  const aspect = availableWidth / Math.max(0.1, availableHeight);
  const columns = Math.min(
    sectionCount,
    Math.max(1, Math.ceil(Math.sqrt(sectionCount * aspect))),
  );
  const rows = Math.ceil(sectionCount / columns);
  const gap = sectionCount === 1 ? 0 : Math.min(0.6, availableWidth * 0.04, availableHeight * 0.04);
  const sectionWidth = Math.max(0.15, (availableWidth - gap * (columns - 1)) / columns);
  const sectionHeight = Math.max(0.15, (availableHeight - gap * (rows - 1)) / rows);

  const beds = Array.from({ length: sectionCount }, (_, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    return {
      id: `section-${index + 1}`,
      name: sectionCount === 1 ? "In-ground Plot" : `Section ${index + 1}`,
      x: round(margin + column * (sectionWidth + gap)),
      y: round(margin + row * (sectionHeight + gap)),
      width: round(sectionWidth),
      height: round(sectionHeight),
      shape: "rect",
    };
  });

  return {
    garden: {
      width: round(width),
      height: round(length),
      sunExposure:
        sunniestSide === "fully_shaded" ? "Fully shaded" : `Most sun on ${sunniestSide} side`,
      gardenType: "In-ground",
      gardenTypeKey: "in_ground",
      sunniestSide,
    },
    beds,
  };
}

function buildRepeatableGeometry(input) {
  const areaLabel =
    input.gardenType === "in_ground"
      ? input.units.length === 1 ? "In-ground plot" : "Section"
      : getAreaCopy(input.gardenType).drawingLabel;
  const units = input.units.map((unit, index) => ({
    ...unit,
    name: input.gardenType === "in_ground" && input.units.length === 1
      ? areaLabel
      : `${areaLabel} ${index + 1}`,
    drawingWidth: Math.max(unit.width, unit.length),
    drawingHeight: Math.min(unit.width, unit.length),
  }));
  const columns = Math.ceil(Math.sqrt(units.length));
  const rowTotal = Math.ceil(units.length / columns);
  const basePerRow = Math.floor(units.length / rowTotal);
  const fullerRows = units.length % rowTotal;
  const rowCounts = Array.from({ length: rowTotal }, (_, index) =>
    basePerRow + (index >= rowTotal - fullerRows ? 1 : 0),
  );
  const gap = input.gardenType === "containers" ? 1 : 2;
  const outer = input.gardenType === "containers" ? 0.75 : 1;
  const rows = [];
  let unitIndex = 0;

  rowCounts.forEach((count) => {
    const rowUnits = units.slice(unitIndex, unitIndex + count);
    rows.push({
      units: rowUnits,
      width:
        rowUnits.reduce((sum, unit) => sum + unit.drawingWidth, 0) +
        gap * Math.max(0, rowUnits.length - 1),
      height: Math.max(...rowUnits.map((unit) => unit.drawingHeight)),
    });
    unitIndex += count;
  });

  const contentWidth = Math.max(...rows.map((row) => row.width));
  const beds = [];
  let y = outer;

  rows.forEach((row) => {
    let x = outer + (contentWidth - row.width) / 2;

    row.units.forEach((unit) => {
      beds.push({
        id: unit.id,
        name: unit.name,
        x: round(x),
        y: round(y),
        width: round(unit.drawingWidth),
        height: round(unit.drawingHeight),
        shape: "rect",
        sunExposure: unit.sunExposure,
        sunExposureLabel: unit.sunExposureLabel,
      });
      x += unit.drawingWidth + gap;
    });

    y += row.height + gap;
  });

  const gardenWidth = round(contentWidth + outer * 2);
  const gardenHeight = round(y - gap + outer);

  return {
    garden: {
      width: gardenWidth,
      height: gardenHeight,
      sunExposure: "Varies by growing area",
      gardenType: input.gardenTypeLabel,
      gardenTypeKey: input.gardenType,
      sunniestSide: "",
    },
    beds,
  };
}

function gardenTypeTitle(value) {
  return getGardenTypeLabel(value);
}

function authoritativeGeometry(input, recommendedGardenType = input.gardenType) {
  if (input.gardenType === "any") {
    return buildRepeatableGeometry({
      ...input,
      gardenType: recommendedGardenType,
      gardenTypeLabel: gardenTypeTitle(recommendedGardenType),
    });
  }
  return input.gardenType === "in_ground"
    ? buildInGroundGeometry(input)
    : buildRepeatableGeometry(input);
}

function placePlantsInGeometry(plants, beds) {
  if (!beds.length) {
    return [];
  }

  const bedIds = new Set(beds.map((bed) => bed.id));
  const assigned = plants.map((plant, index) => ({
    ...plant,
    bedId: bedIds.has(plant.bedId) ? plant.bedId : beds[index % beds.length].id,
  }));

  return assigned.map((plant) => {
    const bed = beds.find((item) => item.id === plant.bedId) || beds[0];
    const siblings = assigned.filter((item) => item.bedId === bed.id);
    const position = siblings.findIndex((item) => item.id === plant.id);
    const columns = Math.ceil(Math.sqrt(siblings.length));
    const rows = Math.ceil(siblings.length / columns);
    const column = position % columns;
    const row = Math.floor(position / columns);
    const x = bed.x + ((column + 1) * bed.width) / (columns + 1);
    const y = bed.y + ((row + 1) * bed.height) / (rows + 1);

    return {
      ...plant,
      x: round(x),
      y: round(y),
      guideId: `guide-${slugify(plant.name)}`,
      placementReason: cleanText(
        plant.placementReason,
        "Fits this area's light and spacing.",
      ),
    };
  });
}

function tipItems(raw, fallback) {
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

function seasonalTimingLabel(whenToPlant) {
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

function cleanGuideNote(value) {
  const note = cleanText(value);
  return /^adjust for (the )?cultivar and local conditions\.?$/i.test(note) ? "" : note;
}

function normalizeContainerSetup(raw, applicable) {
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

function normalizeGuide(rawGuide, plants) {
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
      spacingInches: round(spacing),
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

function fallbackPlantNames(selectedPlants) {
  const catalog = {
    Flowers: ["Marigold", "Zinnia"],
    Vegetables: ["Tomato", "Bush Bean"],
    Herbs: ["Basil", "Thyme"],
    "Medicinal Plants": ["Chamomile", "Calendula"],
    "Easy-Care Plants": ["Leaf Lettuce", "Chives"],
    "Basic Plants": ["Leaf Lettuce", "Chives"],
  };
  const names = selectedPlants.flatMap((category) => catalog[category] || []);
  return [...new Set(names)].slice(0, 10);
}

function fallbackPlants(input, beds) {
  const names = fallbackPlantNames(input.selectedPlants);
  const source = names.length ? names : ["Marigold", "Basil", "Leaf Lettuce"];
  return source.map((name, index) => ({
    id: `plant-${index + 1}`,
    name,
    bedId: beds[index % beds.length].id,
    x: 0,
    y: 0,
    spacingInches: name === "Tomato" ? 24 : name === "Bush Bean" ? 6 : 8,
    quantity: name === "Tomato" ? 2 : 6,
    sunNeeds: ["Leaf Lettuce", "Chives"].includes(name) ? "partial_shade" : "full_sun",
    placementReason: "Balanced here for sunlight, spacing, and companion planting.",
  }));
}

export function normalizeGardenPlan(raw, plannerInput) {
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
  const layout = {
    version: "1.0",
    units: "ft",
    ...geometry,
    plants,
  };

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
    plantingGuide: normalizeGuide(raw.plantingGuide, plants),
  };
}

export function createFallbackGardenPlan(plannerInput) {
  const input = normalizePlannerInput(plannerInput);
  if (!input) {
    return null;
  }
  const largestArea = input.units.reduce(
    (largest, unit) => Math.max(largest, unit.width * unit.length),
    0,
  );
  const recommendedGardenType =
    input.gardenType === "any"
      ? largestArea > 0 && largestArea <= 16
        ? "containers"
        : "raised_beds"
      : input.gardenType;
  const geometry = authoritativeGeometry(input, recommendedGardenType);
  const plants = placePlantsInGeometry(fallbackPlants(input, geometry.beds), geometry.beds);
  const layout = {
    version: "1.0",
    units: "ft",
    ...geometry,
    plants,
  };

  return {
    recommendedGardenType,
    summary: `A beginner-friendly ${gardenTypeTitle(recommendedGardenType).toLowerCase()} plan sized to your submitted growing areas.`,
    layout,
    tips: {
      preferenceHelp: [],
      companionPlanting: [
        { title: "Mix useful neighbors", detail: "Pair flowering plants and herbs with vegetables to support pollinators." },
      ],
      avoid: [
        { title: "Protect airflow", detail: "Do not fill every open inch; crowded leaves stay wet longer." },
      ],
      watering: [
        { title: "Test the soil", detail: "Water when the top inch is dry, then soak deeply instead of sprinkling daily." },
        { title: "Watch both signals", detail: "Dry, crisp leaves suggest thirst; soft yellow leaves can signal excess water." },
      ],
      commonMistakes: [
        { title: "Planting too much", detail: "Begin with the shown quantities and expand after the first harvest." },
      ],
      containerSetup: normalizeContainerSetup({}, recommendedGardenType === "containers"),
    },
    plantingGuide: normalizeGuide([], plants),
  };
}

export function createExampleGardenPlan() {
  return createFallbackGardenPlan({
    zipCode: "80205",
    gardenType: "raised_beds",
    gardenTypeLabel: "Raised beds",
    selectedPlants: ["Vegetables", "Herbs", "Flowers"],
    plantTypes: ["vegetables", "herbs", "flowers"],
    preferences: "Pollinator friendly and beginner friendly",
    units: [
      { width: 8, length: 4, sunExposure: "full_sun" },
      { width: 8, length: 4, sunExposure: "partial_shade" },
      { width: 6, length: 3, sunExposure: "full_sun" },
      { width: 6, length: 3, sunExposure: "partial_shade" },
    ],
  });
}

export function parseGardenPlanFromLlmText(rawText, plannerInput) {
  const parsed = parseJsonLoose(rawText);
  return normalizeGardenPlan(parsed, plannerInput);
}

export function buildGardenPlanGenerationPrompt(plannerInput, currentDate) {
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
- Include quantities and seed spacing that realistically fit each area.
- For every plantingGuide item, explain how many seeds to start or sow in sowingAmount. Recommend a modest germination buffer and thinning where appropriate. Only suggest sowing a whole packet when that is sensible for small direct-sown seed, the available area, and succession timing.
- Provide one plantingGuide item per unique plant. Use now, next_month, or next_season for whenToPlant, and make timingLabel explicit and calendar-friendly, such as “Plant this fall” or “Plant next spring”; never display “Plant next season.” Add a concise timing explanation.
- Only include plantingDepth or watering when the advice is meaningfully specific to that plant. Otherwise return an empty string because universal seed-depth and establishment-watering advice is shown once above the guide.
- Tips must cover beneficial neighbors, combinations to avoid, overwatering versus underwatering signs, low-water plants when appropriate, and common beginner mistakes.
- Do not present gardening folklore or weak companion-planting claims as proven fact; use cautious language and favor spacing, airflow, light, and water explanations.
- State uncertainty briefly when ZIP alone cannot determine a precise frost date or local practice.
- Keep advice concise, friendly, and actionable.
- Do not recommend invasive plants without a containment warning.

${containerInstructions}`;
}
