const BED_SHAPES = new Set(["rect", "circle"]);

function normalizeBedShape(value) {
  return BED_SHAPES.has(value) ? value : "rect";
}

function colorForPlant(name, sunNeeds = "partial_shade") {
  const hash = [...String(name || "")].reduce(
    (total, character) => character.charCodeAt(0) + ((total << 5) - total),
    0,
  );
  const tone = Math.abs(hash) % 14;

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

function plantSpaceWeight(plant) {
  const quantity = Math.max(1, Number(plant.quantity) || 1);
  const spacingFeet = Math.max(0.25, (Number(plant.spacingInches) || 8) / 12);
  return Math.max(0.25, quantity * spacingFeet * spacingFeet);
}

function createPlantMarkers(plant, patch) {
  const { xPx, yPx, widthPx, heightPx } = patch;
  const desiredCount = Math.min(200, Math.max(1, Number(plant.quantity) || 1));
  const availableColumns = Math.max(1, Math.floor((widthPx - 12) / 18));
  const availableRows = Math.max(1, Math.floor((heightPx - 18) / 18));
  const markerCount = Math.min(desiredCount, availableColumns * availableRows);
  const columns = Math.min(
    availableColumns,
    Math.max(1, Math.ceil(Math.sqrt(markerCount))),
  );
  const rows = Math.ceil(markerCount / columns);
  const markerAreaWidth = Math.max(0, widthPx - 16);
  const markerAreaHeight = Math.max(0, heightPx - 26);

  return Array.from({ length: markerCount }, (_, index) => ({
    id: `${plant.id}-marker-${index + 1}`,
    plantId: plant.id,
    name: plant.name,
    xPx: xPx + 8 + (((index % columns) + 0.5) * markerAreaWidth) / columns,
    yPx: yPx + 17 + ((Math.floor(index / columns) + 0.5) * markerAreaHeight) / rows,
    color: patch.color,
  }));
}

/**
 * Relative zone sizes for a bed's plants. A filled plan stores a fixed areaShare per
 * group so its zones (and the capacity computed from them) stay put; otherwise zones
 * are weighted by quantity × spacing².
 */
export function plantZoneWeights(plants) {
  if (plants.length && plants.every((plant) => Number(plant.areaShare) > 0)) {
    return plants.map((plant) => Number(plant.areaShare));
  }
  const rawWeights = plants.map(plantSpaceWeight);
  const rawTotal = rawWeights.reduce((sum, weight) => sum + weight, 0);
  const minimumWeight = rawTotal * 0.08;
  return rawWeights.map((weight) => Math.max(minimumWeight, weight));
}

/**
 * Order of a bed's plant zones: along its long axis, with the other axis breaking ties.
 * Plants placed in the same grid column share x, so the tiebreak is what lets a swap
 * (which exchanges x and y) actually reorder their zones.
 */
export function zoneOrder(bed) {
  const horizontal = bed.width >= bed.height;
  return (left, right) =>
    horizontal ? left.x - right.x || left.y - right.y : left.y - right.y || left.x - right.x;
}

export function allocatePlantZones(bed, plants) {
  if (!plants.length) {
    return [];
  }

  const inset = Math.min(0.22, bed.width * 0.045, bed.height * 0.045);
  const gap = Math.min(0.12, bed.width * 0.025, bed.height * 0.025);
  const innerX = bed.x + inset;
  const innerY = bed.y + inset;
  const innerWidth = Math.max(0.15, bed.width - inset * 2);
  const innerHeight = Math.max(0.15, bed.height - inset * 2);
  const horizontal = bed.width >= bed.height;
  const availableLength = Math.max(
    0.15,
    (horizontal ? innerWidth : innerHeight) - gap * (plants.length - 1),
  );
  const weights = plantZoneWeights(plants);
  const weightTotal = weights.reduce((sum, weight) => sum + weight, 0);
  let cursor = horizontal ? innerX : innerY;

  return plants.map((plant, index) => {
    const allocatedLength =
      index === plants.length - 1
        ? horizontal
          ? innerX + innerWidth - cursor
          : innerY + innerHeight - cursor
        : (availableLength * weights[index]) / weightTotal;
    const zone = {
      id: `${plant.id}-zone`,
      plantId: plant.id,
      bedId: bed.id,
      name: plant.name,
      x: horizontal ? cursor : innerX,
      y: horizontal ? innerY : cursor,
      width: horizontal ? allocatedLength : innerWidth,
      height: horizontal ? innerHeight : allocatedLength,
      color: colorForPlant(plant.name, plant.sunNeeds),
    };

    cursor += allocatedLength + gap;
    return zone;
  });
}

export function layoutToSvgModel(layout, pixelsPerFoot = null, padding = 24) {
  const longestSide = Math.max(layout.garden.width, layout.garden.height);
  const scale = pixelsPerFoot || Math.max(12, Math.min(44, 980 / Math.max(1, longestSide)));
  const viewWidth = Math.round(layout.garden.width * scale + padding * 2);
  const viewHeight = Math.round(layout.garden.height * scale + padding * 2);
  const beds = layout.beds.map((bed) => {
    const xPx = padding + bed.x * scale;
    const yPx = padding + bed.y * scale;
    const widthPx = bed.width * scale;
    const heightPx = bed.height * scale;

    return {
      ...bed,
      shape: normalizeBedShape(bed.shape),
      xPx,
      yPx,
      widthPx,
      heightPx,
      cxPx: xPx + widthPx / 2,
      cyPx: yPx + heightPx / 2,
      rPx: Math.min(widthPx, heightPx) / 2,
    };
  });
  const plantPatches = [];
  const plantMarkers = [];

  beds.forEach((bed) => {
    const plants = layout.plants
      .filter((plant) => plant.bedId === bed.id)
      .sort(zoneOrder(bed));

    allocatePlantZones(bed, plants).forEach((zone) => {
      const xPx = padding + zone.x * scale;
      const yPx = padding + zone.y * scale;
      const widthPx = Math.max(5, zone.width * scale);
      const heightPx = Math.max(5, zone.height * scale);
      const patch = {
        ...zone,
        xPx,
        yPx,
        widthPx,
        heightPx,
        centerX: xPx + widthPx / 2,
        centerY: yPx + heightPx / 2,
      };
      const plant = plants.find((item) => item.id === zone.plantId);

      plantPatches.push(patch);
      if (plant) {
        plantMarkers.push(...createPlantMarkers(plant, patch));
      }
    });
  });

  return {
    viewBox: `0 0 ${viewWidth} ${viewHeight}`,
    widthPx: viewWidth,
    heightPx: viewHeight,
    viewWidth,
    viewHeight,
    padding,
    pixelsPerFoot: scale,
    beds,
    plantMarkers,
    plantPatches,
  };
}

export function getPlantSectionSizes(layout) {
  const model = layoutToSvgModel(layout);
  const plants = new Map(layout.plants.map((plant) => [plant.id, plant]));
  const beds = new Map(layout.beds.map((bed) => [bed.id, bed]));
  const sectionsByPlant = {};
  const roundToQuarter = (value) => Math.max(0.25, Math.round(value * 4) / 4);

  model.plantPatches.forEach((patch) => {
    const plant = plants.get(patch.plantId);
    if (!plant) {
      return;
    }

    const key = plant.name.toLowerCase();
    const section = {
      bedName: beds.get(patch.bedId)?.name || "Growing area",
      width: roundToQuarter(patch.width),
      height: roundToQuarter(patch.height),
      squareFeet: roundToQuarter(patch.width * patch.height),
    };
    sectionsByPlant[key] = [...(sectionsByPlant[key] || []), section];
  });

  return sectionsByPlant;
}
