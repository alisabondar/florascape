import {
  getAreaCopy,
  getGardenTypeLabel,
  isGardenType,
  PLANT_TYPE_KEYS,
  PREFERENCES_MAX_LENGTH,
} from "../planner-config";
import { SUN_LEVELS } from "./schema";

export function finitePositive(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

export function round(value) {
  return Math.round(value * 100) / 100;
}

export function cleanText(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

export function slugify(value) {
  return String(value || "plant")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "plant";
}

export function parseJsonLoose(rawText) {
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
    plantTypes: Array.isArray(raw.plantTypes)
      ? [...new Set(raw.plantTypes.filter((type) => PLANT_TYPE_KEYS.includes(type)))]
      : [],
    selectedPlants,
    preferences: cleanText(raw.preferences).slice(0, PREFERENCES_MAX_LENGTH),
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

export function buildInGroundGeometry(input) {
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

export function buildRepeatableGeometry(input) {
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

export function gardenTypeTitle(value) {
  return getGardenTypeLabel(value);
}

export function authoritativeGeometry(input, recommendedGardenType = input.gardenType) {
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

export function placePlantsInGeometry(plants, beds) {
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
