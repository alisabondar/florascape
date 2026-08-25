const SUN_LEVELS = new Set(["full_sun", "partial_shade", "shade"]);
const RENDER_STYLES = new Set(["icons", "patch"]);
const BED_SHAPES = new Set(["rect", "circle"]);

export function createExampleGardenLayout() {
  const layout = {
    version: "1.0",
    units: "ft",
    garden: {
      width: 14,
      height: 14,
      sunExposure: "Partial Shade",
      gardenType: "Raised beds",
    },
    beds: [
      { id: "bed-top", name: "Top Herb Strip", x: 1.2, y: 0.8, width: 9.6, height: 1.5 },
      { id: "bed-right-top", name: "Tomatillo Strip", x: 12.1, y: 0.8, width: 1.1, height: 5.6 },
      { id: "bed-left", name: "Carrot + Greens Strip", x: 0.8, y: 2.5, width: 1.1, height: 6.8 },
      { id: "bed-a", name: "Eggplant Garden", x: 2.4, y: 3.8, width: 3.1, height: 2.8 },
      { id: "bed-b", name: "Pepper Garden", x: 7.1, y: 3.8, width: 3.1, height: 2.8 },
      { id: "bed-c", name: "Basil Garden", x: 2.4, y: 7.5, width: 3.1, height: 2.8 },
      { id: "bed-d", name: "Lettuce Garden", x: 7.1, y: 7.5, width: 3.1, height: 2.8 },
      { id: "bed-center", name: "Focal Point", x: 5.45, y: 5.55, width: 2.3, height: 2.3, shape: "circle" },
      { id: "bed-right-mid", name: "Sage + Sorrel", x: 11.1, y: 3.2, width: 1.8, height: 3.0 },
      { id: "bed-right-lower", name: "Beans + Mint", x: 11.1, y: 7.4, width: 2.2, height: 2.9 },
      { id: "bed-bottom", name: "Bottom Strip", x: 2.2, y: 10.7, width: 8.8, height: 1.0 },
    ],
    plants: [
      {
        id: "p-1",
        name: "Squash",
        bedId: "bed-top",
        x: 1.8,
        y: 1.45,
        spacingInches: 20,
        quantity: 6,
        sunNeeds: "full_sun",
      },
      {
        id: "p-2",
        name: "Parsley Cilantro",
        bedId: "bed-top",
        x: 3.3,
        y: 1.45,
        spacingInches: 7,
        quantity: 20,
        sunNeeds: "partial_shade",
        renderStyle: "patch",
        coverage: 0.45,
      },
      {
        id: "p-3",
        name: "Oregano",
        bedId: "bed-top",
        x: 5.7,
        y: 1.4,
        spacingInches: 8,
        quantity: 12,
        sunNeeds: "full_sun",
        renderStyle: "patch",
        coverage: 0.22,
      },
      {
        id: "p-4",
        name: "Tarragon",
        bedId: "bed-top",
        x: 6.9,
        y: 1.45,
        spacingInches: 8,
        quantity: 10,
        sunNeeds: "full_sun",
      },
      {
        id: "p-5",
        name: "Thyme",
        bedId: "bed-top",
        x: 8.0,
        y: 1.45,
        spacingInches: 9,
        quantity: 12,
        sunNeeds: "full_sun",
      },
      {
        id: "p-6",
        name: "Rhubarb",
        bedId: "bed-top",
        x: 9.4,
        y: 1.35,
        spacingInches: 24,
        quantity: 4,
        sunNeeds: "full_sun",
      },
      {
        id: "p-7",
        name: "Tomatillo",
        bedId: "bed-right-top",
        x: 12.6,
        y: 2.1,
        spacingInches: 20,
        quantity: 6,
        sunNeeds: "full_sun",
      },
      {
        id: "p-8",
        name: "Tall Support Plants",
        bedId: "bed-right-top",
        x: 12.6,
        y: 4.7,
        spacingInches: 10,
        quantity: 16,
        renderStyle: "patch",
        coverage: 0.5,
        sunNeeds: "full_sun",
      },
      {
        id: "p-9",
        name: "Carrots",
        bedId: "bed-left",
        x: 1.35,
        y: 4.3,
        spacingInches: 3,
        quantity: 42,
        sunNeeds: "full_sun",
        renderStyle: "patch",
        coverage: 0.47,
      },
      {
        id: "p-10",
        name: "Oriental Greens",
        bedId: "bed-left",
        x: 1.35,
        y: 7.9,
        spacingInches: 5,
        quantity: 24,
        sunNeeds: "partial_shade",
        renderStyle: "patch",
        coverage: 0.43,
      },
      {
        id: "p-11",
        name: "Eggplant",
        bedId: "bed-a",
        x: 3.95,
        y: 5.2,
        spacingInches: 22,
        quantity: 7,
        sunNeeds: "full_sun",
      },
      {
        id: "p-12",
        name: "Pepper",
        bedId: "bed-b",
        x: 8.65,
        y: 5.2,
        spacingInches: 18,
        quantity: 8,
        sunNeeds: "full_sun",
      },
      {
        id: "p-13",
        name: "Basil",
        bedId: "bed-c",
        x: 3.95,
        y: 8.85,
        spacingInches: 8,
        quantity: 28,
        sunNeeds: "partial_shade",
        renderStyle: "patch",
        coverage: 0.64,
      },
      {
        id: "p-14",
        name: "Lettuce",
        bedId: "bed-d",
        x: 8.65,
        y: 8.85,
        spacingInches: 6,
        quantity: 34,
        sunNeeds: "partial_shade",
        renderStyle: "patch",
        coverage: 0.7,
      },
      {
        id: "p-15",
        name: "Pollinator Mix",
        bedId: "bed-center",
        x: 6.6,
        y: 6.7,
        spacingInches: 6,
        quantity: 22,
        sunNeeds: "partial_shade",
        renderStyle: "patch",
        coverage: 0.9,
      },
      {
        id: "p-16",
        name: "Sage",
        bedId: "bed-right-mid",
        x: 12.0,
        y: 4.3,
        spacingInches: 14,
        quantity: 6,
        sunNeeds: "partial_shade",
      },
      {
        id: "p-17",
        name: "Sorrel",
        bedId: "bed-right-mid",
        x: 12.0,
        y: 5.4,
        spacingInches: 8,
        quantity: 14,
        sunNeeds: "partial_shade",
        renderStyle: "patch",
        coverage: 0.5,
      },
      {
        id: "p-18",
        name: "Beans",
        bedId: "bed-right-lower",
        x: 11.85,
        y: 8.95,
        spacingInches: 6,
        quantity: 26,
        sunNeeds: "full_sun",
        renderStyle: "patch",
        coverage: 0.52,
      },
      {
        id: "p-19",
        name: "Mint",
        bedId: "bed-right-lower",
        x: 12.65,
        y: 8.95,
        spacingInches: 8,
        quantity: 20,
        sunNeeds: "partial_shade",
        renderStyle: "patch",
        coverage: 0.45,
      },
      {
        id: "p-20",
        name: "Arugula",
        bedId: "bed-bottom",
        x: 4.2,
        y: 11.2,
        spacingInches: 5,
        quantity: 28,
        sunNeeds: "partial_shade",
        renderStyle: "patch",
        coverage: 0.45,
      },
      {
        id: "p-21",
        name: "Beets",
        bedId: "bed-bottom",
        x: 8.85,
        y: 11.2,
        spacingInches: 4,
        quantity: 24,
        sunNeeds: "full_sun",
        renderStyle: "patch",
        coverage: 0.45,
      },
    ],
    paths: [
      { id: "path-1", x1: 6.6, y1: 2.4, x2: 6.6, y2: 11.2, width: 1.1 },
      { id: "path-2", x1: 2.0, y1: 6.9, x2: 11.2, y2: 6.9, width: 1.1 },
      { id: "path-3", x1: 0.8, y1: 11.3, x2: 13.2, y2: 11.3, width: 0.9 },
      { id: "path-4", x1: 11.2, y1: 6.9, x2: 11.2, y2: 11.3, width: 0.9 },
    ],
    sunZones: [
      { id: "sun-west", x: 0.7, y: 0.7, width: 3.9, height: 12.5, level: "shade" },
      { id: "sun-middle", x: 4.6, y: 0.7, width: 4.2, height: 12.5, level: "partial_shade" },
      { id: "sun-east", x: 8.8, y: 0.7, width: 4.5, height: 12.5, level: "full_sun" },
    ],
    companions: [
      { id: "comp-1", plantA: "Pepper", plantB: "Basil", note: "Pest pressure balance" },
      { id: "comp-2", plantA: "Carrots", plantB: "Oriental Greens", note: "Root + leaf rhythm" },
      { id: "comp-3", plantA: "Beans", plantB: "Sage", note: "Airflow and pest support" },
      { id: "comp-4", plantA: "Tomatillo", plantB: "Sorrel", note: "Edge diversity support" },
    ],
    avoidPairs: [
      { id: "avoid-1", plantA: "Beans", plantB: "Mint", note: "Contain mint spread" },
      { id: "avoid-2", plantA: "Squash", plantB: "Arugula", note: "Reduce shading conflict" },
    ],
    notes: [
      "Reference-style plan with perimeter strips, central blocks, and grouped crop patches.",
      "Use drag handles to fine-tune each plant group after generation.",
    ],
  };
  layout.plants = applyCompanionProximity(layout.beds, layout.plants, layout.companions);
  return layout;
}

function toFiniteNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function clampToTwoDecimals(value) {
  return Math.round(value * 100) / 100;
}

function normalizeSunLevel(value, fallback = "partial_shade") {
  const normalized = String(value || "")
    .toLowerCase()
    .replace(/\s+/g, "_");
  return SUN_LEVELS.has(normalized) ? normalized : fallback;
}

function normalizeRenderStyle(value) {
  const normalized = String(value || "")
    .toLowerCase()
    .replace(/\s+/g, "_");
  return RENDER_STYLES.has(normalized) ? normalized : "icons";
}

function normalizeBedShape(value) {
  const normalized = String(value || "")
    .toLowerCase()
    .replace(/\s+/g, "_");
  return BED_SHAPES.has(normalized) ? normalized : "rect";
}

function normalizeCoverage(value) {
  const num = toFiniteNumber(value);
  if (num === null) {
    return null;
  }
  if (num <= 0 || num > 1) {
    return null;
  }
  return clampToTwoDecimals(num);
}

function clampNumber(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function bedCenter(bed) {
  return {
    x: bed.x + bed.width / 2,
    y: bed.y + bed.height / 2,
  };
}

function clampPointToBed(bed, x, y, margin = 0.2) {
  if (!bed) {
    return { x: clampToTwoDecimals(x), y: clampToTwoDecimals(y) };
  }

  if (bed.shape === "circle") {
    const center = bedCenter(bed);
    const radius = Math.max(0.2, Math.min(bed.width, bed.height) / 2 - margin);
    const dx = x - center.x;
    const dy = y - center.y;
    const distance = Math.hypot(dx, dy);

    if (distance > radius && distance > 0) {
      const scale = radius / distance;
      return {
        x: clampToTwoDecimals(center.x + dx * scale),
        y: clampToTwoDecimals(center.y + dy * scale),
      };
    }

    return {
      x: clampToTwoDecimals(x),
      y: clampToTwoDecimals(y),
    };
  }

  return {
    x: clampToTwoDecimals(clampNumber(x, bed.x + margin, bed.x + bed.width - margin)),
    y: clampToTwoDecimals(clampNumber(y, bed.y + margin, bed.y + bed.height - margin)),
  };
}

function pointTowardBedEdge(bed, ux, uy, direction = 1, margin = 0.25) {
  const center = bedCenter(bed);
  const dirX = ux * direction;
  const dirY = uy * direction;

  if (bed.shape === "circle") {
    const radius = Math.max(0.2, Math.min(bed.width, bed.height) / 2 - margin);
    return {
      x: center.x + dirX * radius,
      y: center.y + dirY * radius,
    };
  }

  const halfW = Math.max(0.2, bed.width / 2 - margin);
  const halfH = Math.max(0.2, bed.height / 2 - margin);

  const tx = Math.abs(dirX) < 1e-6 ? Number.POSITIVE_INFINITY : halfW / Math.abs(dirX);
  const ty = Math.abs(dirY) < 1e-6 ? Number.POSITIVE_INFINITY : halfH / Math.abs(dirY);
  const t = Math.min(tx, ty);

  return {
    x: center.x + dirX * t,
    y: center.y + dirY * t,
  };
}

function findPlantByName(plants, name) {
  const key = String(name || "").trim().toLowerCase();
  if (!key) {
    return null;
  }

  const exact = plants.find((plant) => plant.name.toLowerCase() === key);
  if (exact) {
    return exact;
  }

  return (
    plants.find(
      (plant) =>
        plant.name.toLowerCase().includes(key) || key.includes(plant.name.toLowerCase()),
    ) || null
  );
}

function applyCompanionProximity(beds, plants, companions) {
  if (!Array.isArray(beds) || !Array.isArray(plants) || !Array.isArray(companions)) {
    return plants;
  }
  if (!companions.length || !plants.length) {
    return plants;
  }

  const nextPlants = plants.map((plant) => ({ ...plant }));
  const bedMap = new Map(beds.map((bed) => [bed.id, bed]));

  companions.forEach((pair, index) => {
    const plantA = findPlantByName(nextPlants, pair.plantA);
    const plantB = findPlantByName(nextPlants, pair.plantB);
    if (!plantA || !plantB || plantA.id === plantB.id) {
      return;
    }

    const bedA = bedMap.get(plantA.bedId);
    const bedB = bedMap.get(plantB.bedId);
    if (!bedA || !bedB) {
      return;
    }

    if (bedA.id === bedB.id) {
      const desired = Math.max(0.6, (plantB.spacingInches || 10) / 12);
      const dx = plantB.x - plantA.x;
      const dy = plantB.y - plantA.y;
      const distance = Math.hypot(dx, dy);
      if (distance > desired) {
        const angle = (index + 1) * (Math.PI / 2.8);
        const target = clampPointToBed(
          bedB,
          plantA.x + Math.cos(angle) * desired,
          plantA.y + Math.sin(angle) * desired,
        );
        plantB.x = target.x;
        plantB.y = target.y;
      }
      return;
    }

    const centerA = bedCenter(bedA);
    const centerB = bedCenter(bedB);
    const vectorX = centerB.x - centerA.x;
    const vectorY = centerB.y - centerA.y;
    const length = Math.hypot(vectorX, vectorY);
    if (length <= 0) {
      return;
    }

    const ux = vectorX / length;
    const uy = vectorY / length;
    const targetA = pointTowardBedEdge(bedA, ux, uy, 1);
    const targetB = pointTowardBedEdge(bedB, ux, uy, -1);

    const clampedA = clampPointToBed(bedA, targetA.x, targetA.y);
    const clampedB = clampPointToBed(bedB, targetB.x, targetB.y);

    plantA.x = clampedA.x;
    plantA.y = clampedA.y;
    plantB.x = clampedB.x;
    plantB.y = clampedB.y;
  });

  return nextPlants;
}

function parseJsonLoose(input) {
  if (!input || typeof input !== "string") {
    return null;
  }

  const fenceMatch = input.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const content = fenceMatch ? fenceMatch[1] : input;
  const start = content.indexOf("{");
  const end = content.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    return null;
  }

  const jsonCandidate = content.slice(start, end + 1);

  try {
    return JSON.parse(jsonCandidate);
  } catch {
    return null;
  }
}

function normalizeGardenLayout(raw) {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const width = toFiniteNumber(raw?.garden?.width);
  const height = toFiniteNumber(raw?.garden?.height);

  if (!width || !height || width <= 0 || height <= 0) {
    return null;
  }

  const beds = Array.isArray(raw.beds)
    ? raw.beds
        .map((bed, index) => {
          const x = toFiniteNumber(bed?.x);
          const y = toFiniteNumber(bed?.y);
          const w = toFiniteNumber(bed?.width);
          const h = toFiniteNumber(bed?.height);
          if (x === null || y === null || w === null || h === null) {
            return null;
          }
          if (w <= 0 || h <= 0) {
            return null;
          }
          return {
            id: String(bed?.id || `bed-${index + 1}`),
            name: String(bed?.name || `Bed ${index + 1}`),
            x: clampToTwoDecimals(x),
            y: clampToTwoDecimals(y),
            width: clampToTwoDecimals(w),
            height: clampToTwoDecimals(h),
            shape: normalizeBedShape(bed?.shape),
          };
        })
        .filter(Boolean)
    : [];

  const bedIds = new Set(beds.map((bed) => bed.id));

  const plants = Array.isArray(raw.plants)
    ? raw.plants
        .map((plant, index) => {
          const x = toFiniteNumber(plant?.x);
          const y = toFiniteNumber(plant?.y);
          if (x === null || y === null) {
            return null;
          }
          const spacing = toFiniteNumber(plant?.spacingInches);
          const quantityRaw = Math.floor(toFiniteNumber(plant?.quantity) || 1);
          const quantity = Math.max(1, Math.min(80, quantityRaw));
          const coverage = normalizeCoverage(plant?.coverage);

          return {
            id: String(plant?.id || `plant-${index + 1}`),
            name: String(plant?.name || `Plant ${index + 1}`),
            bedId: String(plant?.bedId || ""),
            x: clampToTwoDecimals(x),
            y: clampToTwoDecimals(y),
            spacingInches: spacing && spacing > 0 ? clampToTwoDecimals(spacing) : null,
            quantity,
            sunNeeds: normalizeSunLevel(plant?.sunNeeds),
            renderStyle: normalizeRenderStyle(plant?.renderStyle),
            coverage,
          };
        })
        .filter((plant) => plant && bedIds.has(plant.bedId))
    : [];

  const paths = Array.isArray(raw.paths)
    ? raw.paths
        .map((path, index) => {
          const x1 = toFiniteNumber(path?.x1);
          const y1 = toFiniteNumber(path?.y1);
          const x2 = toFiniteNumber(path?.x2);
          const y2 = toFiniteNumber(path?.y2);
          const pathWidth = toFiniteNumber(path?.width);
          if (
            x1 === null ||
            y1 === null ||
            x2 === null ||
            y2 === null ||
            pathWidth === null ||
            pathWidth <= 0
          ) {
            return null;
          }
          return {
            id: String(path?.id || `path-${index + 1}`),
            x1: clampToTwoDecimals(x1),
            y1: clampToTwoDecimals(y1),
            x2: clampToTwoDecimals(x2),
            y2: clampToTwoDecimals(y2),
            width: clampToTwoDecimals(pathWidth),
          };
        })
        .filter(Boolean)
    : [];

  const sunZones = Array.isArray(raw.sunZones)
    ? raw.sunZones
        .map((zone, index) => {
          const x = toFiniteNumber(zone?.x);
          const y = toFiniteNumber(zone?.y);
          const w = toFiniteNumber(zone?.width);
          const h = toFiniteNumber(zone?.height);
          if (x === null || y === null || w === null || h === null || w <= 0 || h <= 0) {
            return null;
          }
          return {
            id: String(zone?.id || `sun-zone-${index + 1}`),
            x: clampToTwoDecimals(x),
            y: clampToTwoDecimals(y),
            width: clampToTwoDecimals(w),
            height: clampToTwoDecimals(h),
            level: normalizeSunLevel(zone?.level, "partial_shade"),
          };
        })
        .filter(Boolean)
    : [];

  const companions = Array.isArray(raw.companions)
    ? raw.companions
        .map((item, index) => ({
          id: String(item?.id || `companion-${index + 1}`),
          plantA: String(item?.plantA || "").trim(),
          plantB: String(item?.plantB || "").trim(),
          note: String(item?.note || "").trim(),
        }))
        .filter((item) => item.plantA && item.plantB)
    : [];

  const avoidPairs = Array.isArray(raw.avoidPairs)
    ? raw.avoidPairs
        .map((item, index) => ({
          id: String(item?.id || `avoid-${index + 1}`),
          plantA: String(item?.plantA || "").trim(),
          plantB: String(item?.plantB || "").trim(),
          note: String(item?.note || "").trim(),
        }))
        .filter((item) => item.plantA && item.plantB)
    : [];

  const notes = Array.isArray(raw.notes)
    ? raw.notes.filter((note) => typeof note === "string").map((note) => note.trim())
    : [];

  if (!beds.length) {
    return null;
  }

  const plantsWithCompanions = applyCompanionProximity(beds, plants, companions);

  return {
    version: "1.0",
    units: "ft",
    garden: {
      width: clampToTwoDecimals(width),
      height: clampToTwoDecimals(height),
      sunExposure: String(raw?.garden?.sunExposure || "Unknown"),
      gardenType: String(raw?.garden?.gardenType || "Garden"),
    },
    beds,
    plants: plantsWithCompanions,
    paths,
    sunZones,
    companions,
    avoidPairs,
    notes,
  };
}

function hashByName(name) {
  let hash = 0;
  const text = String(name || "");
  for (let i = 0; i < text.length; i += 1) {
    hash = text.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

function areaColorBySunNeeds(name, sunNeeds = "partial_shade") {
  const hash = hashByName(name);
  const tone = hash % 14;

  if (sunNeeds === "full_sun") {
    return {
      fill: `hsl(43 88% ${70 + tone * 0.55}%)`,
      stroke: `hsl(35 52% ${36 + tone * 0.4}%)`,
    };
  }

  if (sunNeeds === "shade") {
    return {
      fill: `hsl(206 46% ${72 + tone * 0.5}%)`,
      stroke: `hsl(205 34% ${36 + tone * 0.4}%)`,
    };
  }

  return {
    fill: `hsl(110 34% ${69 + tone * 0.5}%)`,
    stroke: `hsl(110 26% ${32 + tone * 0.4}%)`,
  };
}

function buildPlantPatch(plant, bed) {
  const quantity = plant.quantity || 1;
  const spacingFt = (plant.spacingInches || 8) / 12;
  const minWidth = Math.max(0.6, bed.width * 0.25);
  const minHeight = Math.max(0.5, bed.height * 0.25);
  const estimatedWidth = Math.max(minWidth, Math.min(bed.width - 0.2, Math.sqrt(quantity) * spacingFt));
  const estimatedHeight = Math.max(
    minHeight,
    Math.min(bed.height - 0.2, (Math.sqrt(quantity) * spacingFt) / 1.3),
  );

  const useCoverage = plant.coverage !== null && plant.coverage !== undefined;
  const patchWidth = useCoverage
    ? Math.max(minWidth, Math.min(bed.width - 0.2, bed.width * plant.coverage))
    : estimatedWidth;
  const patchHeight = useCoverage
    ? Math.max(
        minHeight,
        Math.min(bed.height - 0.2, bed.height * (0.75 + Math.min(0.25, plant.coverage * 0.25))),
      )
    : estimatedHeight;

  const x = Math.max(
    bed.x + 0.1,
    Math.min(plant.x - patchWidth / 2, bed.x + bed.width - patchWidth - 0.1),
  );
  const y = Math.max(
    bed.y + 0.1,
    Math.min(plant.y - patchHeight / 2, bed.y + bed.height - patchHeight - 0.1),
  );

  return {
    id: `${plant.id}-patch`,
    plantId: plant.id,
    name: plant.name,
    x,
    y,
    width: patchWidth,
    height: patchHeight,
    shape: bed.shape === "circle" ? "circle" : "rect",
  };
}
export function parseLayoutFromLlmText(rawText) {
  const parsed = parseJsonLoose(rawText);
  return normalizeGardenLayout(parsed);
}

export function buildLayoutGenerationPrompt(userPrompt) {
  return `Convert the following garden request into JSON for an interactive sketch editor.

Return JSON only. No markdown.

Required schema:
{
  "version": "1.0",
  "units": "ft",
  "garden": {
    "width": number,
    "height": number,
    "sunExposure": string,
    "gardenType": string
  },
  "beds": [
    {
      "id": string,
      "name": string,
      "x": number,
      "y": number,
      "width": number,
      "height": number,
      "shape": "rect" | "circle" (optional)
    }
  ],
  "plants": [
    {
      "id": string,
      "name": string,
      "bedId": string,
      "x": number,
      "y": number,
      "spacingInches": number,
      "quantity": number,
      "sunNeeds": "full_sun" | "partial_shade" | "shade",
      "renderStyle": "icons" | "patch",
      "coverage": number (optional, 0-1, for patch density)
    }
  ],
  "paths": [
    { "id": string, "x1": number, "y1": number, "x2": number, "y2": number, "width": number }
  ],
  "sunZones": [
    { "id": string, "x": number, "y": number, "width": number, "height": number, "level": "full_sun" | "partial_shade" | "shade" }
  ],
  "companions": [
    { "id": string, "plantA": string, "plantB": string, "note": string }
  ],
  "avoidPairs": [
    { "id": string, "plantA": string, "plantB": string, "note": string }
  ],
  "notes": [string]
}

Rules:
- Coordinates are in feet from top-left origin.
- Keep all beds and plants inside garden bounds.
- Include at least 3 beds.
- Include at least 8 plant groups.
- Most plant groups should have quantity > 1.
- Repeat plant groups across beds when that improves companion planting, succession harvests, or sun/shade fit.
- Place companion pairs physically near each other (same bed or adjacent beds).
- Use renderStyle "patch" for dense crops like lettuce/carrots and "icons" for larger spaced crops.
- Use coverage between 0.35 and 0.9 for patch groups to indicate how much bed area they occupy.
- Include 2-4 paths.
- Include sunZones covering most of the garden.
- Include at least 2 companion pairs and 1 avoid pair.

Garden request:
${userPrompt}`;
}

export function layoutToSvgModel(layout, pxPerFt = 44, padding = 20) {
  const widthPx = layout.garden.width * pxPerFt;
  const heightPx = layout.garden.height * pxPerFt;
  const viewWidth = Math.round(widthPx + padding * 2);
  const viewHeight = Math.round(heightPx + padding * 2);

  const beds = layout.beds.map((bed) => {
    const shape = normalizeBedShape(bed.shape);
    const xPx = padding + bed.x * pxPerFt;
    const yPx = padding + bed.y * pxPerFt;
    const widthPx = bed.width * pxPerFt;
    const heightPx = bed.height * pxPerFt;
    const cxPx = xPx + widthPx / 2;
    const cyPx = yPx + heightPx / 2;
    const rPx = Math.min(widthPx, heightPx) / 2;

    return {
      ...bed,
      shape,
      xPx,
      yPx,
      widthPx,
      heightPx,
      cxPx,
      cyPx,
      rPx,
    };
  });

  const bedMap = new Map(beds.map((bed) => [bed.id, bed]));

  const plants = layout.plants.map((plant) => ({
    ...plant,
    xPx: padding + plant.x * pxPerFt,
    yPx: padding + plant.y * pxPerFt,
    radiusPx: 7,
  }));

  const paths = layout.paths.map((path) => ({
    ...path,
    x1Px: padding + path.x1 * pxPerFt,
    y1Px: padding + path.y1 * pxPerFt,
    x2Px: padding + path.x2 * pxPerFt,
    y2Px: padding + path.y2 * pxPerFt,
    widthPx: Math.max(5, path.width * pxPerFt * 0.35),
  }));

  const sunZones = (layout.sunZones || []).map((zone) => ({
    ...zone,
    xPx: padding + zone.x * pxPerFt,
    yPx: padding + zone.y * pxPerFt,
    widthPx: zone.width * pxPerFt,
    heightPx: zone.height * pxPerFt,
  }));

  const plantPatches = [];
  const plantMarkers = [];

  plants.forEach((plant) => {
    const quantity = plant.quantity || 1;
    const bed = bedMap.get(plant.bedId);
    const color = areaColorBySunNeeds(plant.name, plant.sunNeeds);
    const usePatch = plant.renderStyle === "patch" || quantity >= 12;

    if (usePatch && bed) {
      const patch = buildPlantPatch(plant, bed);
      plantPatches.push({
        ...patch,
        shape:
          patch.shape === "circle" || plant.sunNeeds === "full_sun" ? "circle" : "rect",
        pattern: plant.sunNeeds === "full_sun" ? "sunburst" : "solid",
        xPx: padding + patch.x * pxPerFt,
        yPx: padding + patch.y * pxPerFt,
        widthPx: patch.width * pxPerFt,
        heightPx: patch.height * pxPerFt,
        color,
      });
    }

    const markerCount = usePatch ? Math.min(10, quantity) : Math.min(18, Math.max(1, quantity));
    const cols = Math.ceil(Math.sqrt(markerCount));
    const rows = Math.ceil(markerCount / cols);
    const gap = 8;
    const startX = plant.xPx - ((cols - 1) * gap) / 2;
    const startY = plant.yPx - ((rows - 1) * gap) / 2;

    for (let i = 0; i < markerCount; i += 1) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      plantMarkers.push({
        id: `${plant.id}-m-${i + 1}`,
        plantId: plant.id,
        name: plant.name,
        xPx: startX + col * gap,
        yPx: startY + row * gap,
        color,
      });
    }
  });

  const plantNameMap = new Map();
  plants.forEach((plant) => {
    const key = plant.name.toLowerCase();
    if (!plantNameMap.has(key)) {
      plantNameMap.set(key, []);
    }
    plantNameMap.get(key).push(plant);
  });

  function centroidByName(name) {
    const points = plantNameMap.get(String(name || "").toLowerCase()) || [];
    if (!points.length) {
      return null;
    }
    const x = points.reduce((sum, point) => sum + point.xPx, 0) / points.length;
    const y = points.reduce((sum, point) => sum + point.yPx, 0) / points.length;
    return { x, y };
  }

  const companionLines = (layout.companions || [])
    .map((pair) => {
      const a = centroidByName(pair.plantA);
      const b = centroidByName(pair.plantB);
      if (!a || !b) {
        return null;
      }
      return {
        id: pair.id,
        plantA: pair.plantA,
        plantB: pair.plantB,
        note: pair.note,
        x1: a.x,
        y1: a.y,
        x2: b.x,
        y2: b.y,
      };
    })
    .filter(Boolean);

  const avoidLines = (layout.avoidPairs || [])
    .map((pair) => {
      const a = centroidByName(pair.plantA);
      const b = centroidByName(pair.plantB);
      if (!a || !b) {
        return null;
      }
      return {
        id: pair.id,
        plantA: pair.plantA,
        plantB: pair.plantB,
        note: pair.note,
        x1: a.x,
        y1: a.y,
        x2: b.x,
        y2: b.y,
      };
    })
    .filter(Boolean);

  return {
    viewBox: `0 0 ${viewWidth} ${viewHeight}`,
    widthPx: viewWidth,
    heightPx: viewHeight,
    viewWidth,
    viewHeight,
    padding,
    pxPerFt,
    beds,
    plants,
    paths,
    sunZones,
    plantMarkers,
    plantPatches,
    companionLines,
    avoidLines,
  };
}
