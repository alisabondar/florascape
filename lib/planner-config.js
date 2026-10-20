export const GARDEN_TYPE_OPTIONS = [
  { value: "any", label: "Any — recommend the best setup" },
  { value: "in_ground", label: "In-ground" },
  { value: "raised_beds", label: "Raised beds" },
  { value: "containers", label: "Containers" },
];

export const SUN_EXPOSURE_OPTIONS = [
  { value: "full_sun", label: "Full sun (6+ hours)" },
  { value: "partial_shade", label: "Partial shade (3–6 hours)" },
  { value: "mostly_shade", label: "Mostly shade (under 3 hours)" },
];

const GARDEN_TYPE_VALUES = new Set(GARDEN_TYPE_OPTIONS.map(({ value }) => value));
const REPEATABLE_GARDEN_TYPES = new Set(["any", "raised_beds", "containers"]);
const AREA_COPY = {
  any: {
    idPrefix: "area",
    formLabel: "Available area",
    drawingLabel: "Available area",
    singular: "available area",
    plural: "available areas",
  },
  raised_beds: {
    idPrefix: "bed",
    formLabel: "Raised bed",
    drawingLabel: "Bed",
    singular: "raised bed",
    plural: "raised beds",
  },
  containers: {
    idPrefix: "container",
    formLabel: "Container",
    drawingLabel: "Container",
    singular: "container",
    plural: "containers",
  },
};

export function isGardenType(value) {
  return GARDEN_TYPE_VALUES.has(value);
}

export function isRepeatableGardenType(value) {
  return REPEATABLE_GARDEN_TYPES.has(value);
}

export function getGardenTypeLabel(value) {
  return GARDEN_TYPE_OPTIONS.find((option) => option.value === value)?.label || value;
}

export function getSunExposureLabel(value) {
  return SUN_EXPOSURE_OPTIONS.find((option) => option.value === value)?.label || value;
}

export function getAreaCopy(gardenType) {
  return AREA_COPY[gardenType] || AREA_COPY.raised_beds;
}

export function getAreaId(gardenType, index) {
  return `${getAreaCopy(gardenType).idPrefix}-${index + 1}`;
}

export function getAreaName(gardenType, index) {
  return `${getAreaCopy(gardenType).drawingLabel} ${index + 1}`;
}

export function getGardenMethodLabel(value) {
  if (value === "in_ground") {
    return "In-ground garden";
  }
  if (value === "containers") {
    return "Container garden";
  }
  return "Raised beds";
}

// Plant category keys submitted by the planner; "basic" is the Easy-Care Plants option.
export const PLANT_TYPE_KEYS = ["flowers", "vegetables", "herbs", "medicinal", "basic"];
export const PREFERENCES_MAX_LENGTH = 500;
